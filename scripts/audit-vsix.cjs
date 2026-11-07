"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function filenamesFromZip(file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.byteLength > 64 && bytes.byteLength < 25_000_000, "Invalid VSIX size");
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  assert(eocd !== -1, "ZIP central directory not found");
  const entries = bytes.readUInt16LE(eocd + 10);
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const offset = bytes.readUInt32LE(eocd + 16);
  assert(entries > 0 && entries < 1000, "Unexpected number of VSIX entries");
  assert(offset + centralSize <= eocd, "Corrupt central directory");
  const files = [];
  let cursor = offset;
  for (let index = 0; index < entries; index++) {
    assert(cursor + 46 <= bytes.length && bytes.readUInt32LE(cursor) === 0x02014b50,
      "Invalid central directory entry");
    const size = bytes.readUInt16LE(cursor + 28);
    const extra = bytes.readUInt16LE(cursor + 30);
    const comment = bytes.readUInt16LE(cursor + 32);
    const filename = bytes.subarray(cursor + 46, cursor + 46 + size).toString("utf8");
    assert(filename && !filename.includes("\\") && !filename.startsWith("/") &&
      !filename.split("/").includes(".."), "Unsafe VSIX file path: " + filename);
    files.push(filename);
    cursor += 46 + size + extra + comment;
  }
  assert(cursor === offset + centralSize, "ZIP central directory boundary mismatch");
  return files;
}
function audit(file) {
  const files = filenamesFromZip(file);
  const needed = [
    "extension/package.json", "extension/README.md", "extension/LICENSE",
    "extension/out/src/extension.js", "extension/media/saturivo-icon.png",
    "extension/media/activity.svg",
  ];
  for (const name of needed) assert(files.includes(name), "Missing required VSIX file: " + name);
  for (const name of files) {
    assert(!/^extension\/(?:\.git|\.github|node_modules|src|test|scripts)(?:\/|$)/i.test(name),
      "Disallowed development or workflow file shipped: " + name);
    assert(!/\/out\/test\//i.test(name), "Compiled test bundle leaked into VSIX: " + name);
    assert(!/(^|\/)(\.env(?:\.[^/]*)?|\.npmrc|\.pypirc|id_rsa|credentials|secrets?)(\/|$)/i.test(name) &&
      !/\.(?:pem|pfx|p12|key|secret)$/i.test(name), "Sensitive filename in VSIX: " + name);
  }
  console.log("Saturivo VSIX content audit: PASS (" + files.length + " entries)");
  return files;
}
if (require.main === module) {
  try { audit(process.argv[2] ?? "saturivo.vsix"); }
  catch (e) { console.error(e); process.exitCode = 1; }
}
module.exports = { audit, filenamesFromZip };
