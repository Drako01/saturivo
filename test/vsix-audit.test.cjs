"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { filenamesFromZip, audit } = require("../scripts/audit-vsix.cjs");

const required = [
  "extension/package.json", "extension/readme.md", "extension/LICENSE.txt",
  "extension/out/src/extension.js", "extension/media/saturivo-icon.png",
  "extension/media/activity.svg",
];

/** Minimal stored ZIP writer for adversarial central-directory metadata. */
function zip(entries) {
  const localParts = [], centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.from(entry.data ?? "x");
    const flags = entry.flags ?? 0;
    const method = entry.method ?? 0;
    const compressed = entry.compressed ?? data.length;
    const uncompressed = entry.uncompressed ?? data.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(compressed, 18);
    local.writeUInt32LE(uncompressed, 22);
    local.writeUInt16LE(name.length, 26);
    localParts.push(local, name, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4); // POSIX ZIP origin
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(compressed, 20);
    central.writeUInt32LE(uncompressed, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(((entry.mode ?? 0o100644) << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const central = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, central, end]);
}
function withZip(entries, callback) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-vsix-audit-"));
  const file = path.join(dir, "candidate.vsix");
  try {
    fs.writeFileSync(file, zip(entries));
    return callback(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("normal standalone VSIX entries pass the metadata and content allowlist", () => {
  withZip(required.map(name => ({ name })), file => {
    assert.deepEqual(filenamesFromZip(file), required);
    assert.deepEqual(audit(file), required);
  });
});

test("rejects case-colliding duplicates and filesystem shadow paths", () => {
  for (const name of ["extension/PACKAGE.json", "extension/package.json/"]) {
    withZip([...required.map(name => ({ name })), { name }], file => {
      assert.throws(() => filenamesFromZip(file), /Duplicate or case-colliding/);
    });
  }
  for (const name of ["../outside.txt", "extension//child", "extension/./child",
    "extension/../outside", "C:/absolute.txt", "/absolute.txt", "extension/\u0000hidden"]) {
    withZip([{ name }], file => {
      assert.throws(() => filenamesFromZip(file), /Unsafe VSIX file path/);
    });
  }
});

test("rejects symbolic links, encrypted entries and unsupported compression", () => {
  for (const entry of [
    { name: "extension/external", mode: 0o120777 },
    { name: "extension/hidden", flags: 1 },
    { name: "extension/archive", method: 99 },
    { name: "extension/bomb", method: 8, compressed: 1,
      uncompressed: 17 * 1024 * 1024 },
    { name: "extension/ratio", method: 8, compressed: 1, uncompressed: 4096 },
  ]) {
    withZip([entry], file => assert.throws(() => filenamesFromZip(file),
      /Symbolic link|Encrypted|unsupported|decompression budget|compression ratio/i));
  }
});

test("rejects falsified local header names, truncated payload and bad directory metadata", () => {
  withZip([{ name: "extension/package.json" }], file => {
    const value = fs.readFileSync(file);
    const tampered = Buffer.from(value);
    tampered.write("x", 30, "utf8");
    fs.writeFileSync(file, tampered);
    assert.throws(() => filenamesFromZip(file), /local and central headers disagree/);
    fs.writeFileSync(file, value.subarray(0, value.length - 2));
    assert.throws(() => filenamesFromZip(file), /central directory not found/);
  });
});

test("audit refuses bundled secrets and build/test source files", () => {
  for (const name of ["extension/.env.local", "extension/secrets/keys.txt",
    "extension/src/extension.ts", "extension/out/test/fixture.js"]) {
    withZip([...required.map(name => ({ name })), { name }], file =>
      assert.throws(() => audit(file), /Sensitive filename|Disallowed development|Compiled test/));
  }
});
