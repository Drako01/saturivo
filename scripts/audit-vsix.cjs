"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");

const MAX_ARCHIVE_BYTES = 25_000_000;
const MAX_UNPACKED_BYTES = 64 * 1024 * 1024;
const MAX_ENTRY_BYTES = 16 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 1000;

/**
 * Inspect ZIP central-directory metadata and matching local headers without
 * unpacking or executing any VSIX entry. This is a release guard, not a
 * replacement for VS Code's ZIP parser or cryptographic artifact checks.
 */
function filenamesFromZip(file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.byteLength > 64 && bytes.byteLength < MAX_ARCHIVE_BYTES, "Invalid VSIX size");
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 &&
        i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) {
      eocd = i;
      break;
    }
  }
  assert(eocd !== -1, "ZIP central directory not found");
  assert(bytes.readUInt16LE(eocd + 4) === 0 && bytes.readUInt16LE(eocd + 6) === 0,
    "Multipart ZIP archives are not supported");
  const diskEntries = bytes.readUInt16LE(eocd + 8);
  const entries = bytes.readUInt16LE(eocd + 10);
  assert(entries > 0 && entries < 1000 && diskEntries === entries,
    "Invalid number of VSIX entries");
  const centralSize = bytes.readUInt32LE(eocd + 12);
  const offset = bytes.readUInt32LE(eocd + 16);
  assert(centralSize !== 0xffffffff && offset !== 0xffffffff &&
    offset + centralSize === eocd, "Corrupt or unsupported ZIP central directory");
  const files = [];
  const seen = new Set();
  let cursor = offset;
  let unpacked = 0;
  for (let index = 0; index < entries; index++) {
    assert(cursor + 46 <= eocd && bytes.readUInt32LE(cursor) === 0x02014b50,
      "Invalid central directory entry");
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressed = bytes.readUInt32LE(cursor + 20);
    const expanded = bytes.readUInt32LE(cursor + 24);
    const nameBytes = bytes.readUInt16LE(cursor + 28);
    const extra = bytes.readUInt16LE(cursor + 30);
    const comment = bytes.readUInt16LE(cursor + 32);
    const disk = bytes.readUInt16LE(cursor + 34);
    const unixMode = bytes.readUInt32LE(cursor + 38) >>> 16;
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameBytes + extra + comment;
    assert(recordEnd <= eocd && nameBytes > 0, "Malformed ZIP central directory record");
    assert(disk === 0 && compressed !== 0xffffffff && expanded !== 0xffffffff &&
      localOffset !== 0xffffffff, "Multipart and ZIP64 entries are not supported");
    assert((flags & 0x41) === 0 && (method === 0 || method === 8),
      "Encrypted or unsupported ZIP entry");
    assert((unixMode & 0o170000) !== 0o120000, "Symbolic link in VSIX is prohibited");
    const nameBuffer = bytes.subarray(cursor + 46, cursor + 46 + nameBytes);
    const filename = nameBuffer.toString("utf8");
    const parts = filename.endsWith("/") ? filename.slice(0, -1).split("/") : filename.split("/");
    assert(Buffer.from(filename, "utf8").equals(nameBuffer) &&
      filename && !filename.includes("\\") && !filename.startsWith("/") &&
      !/^[a-z]:/i.test(filename) && !/[\x00-\x1f\x7f]/.test(filename) &&
      parts.every(part => part !== "" && part !== "." && part !== ".."),
      "Unsafe VSIX file path: " + filename);
    const key = filename.replace(/\/$/, "").toLowerCase();
    assert(!seen.has(key), "Duplicate or case-colliding VSIX file: " + filename);
    seen.add(key);
    assert(expanded <= MAX_ENTRY_BYTES, "VSIX entry exceeds decompression budget: " + filename);
    unpacked += expanded;
    assert(unpacked <= MAX_UNPACKED_BYTES, "VSIX expanded size exceeds total budget");
    assert(expanded === 0 || (compressed > 0 && expanded / compressed <= MAX_COMPRESSION_RATIO),
      "Suspicious VSIX compression ratio: " + filename);
    assert(method !== 0 || expanded === compressed, "Invalid stored ZIP entry size");
    if (filename.endsWith("/")) assert(expanded === 0, "ZIP directory has unexpected data");
    assert(localOffset + 30 <= offset && bytes.readUInt32LE(localOffset) === 0x04034b50,
      "Missing or invalid local ZIP entry header");
    const localFlags = bytes.readUInt16LE(localOffset + 6);
    const localMethod = bytes.readUInt16LE(localOffset + 8);
    const localNameBytes = bytes.readUInt16LE(localOffset + 26);
    const localExtra = bytes.readUInt16LE(localOffset + 28);
    const localName = bytes.subarray(localOffset + 30, localOffset + 30 + localNameBytes);
    const dataOffset = localOffset + 30 + localNameBytes + localExtra;
    assert(localFlags === flags && localMethod === method && localName.equals(nameBuffer) &&
      dataOffset + compressed <= offset, "ZIP local and central headers disagree: " + filename);
    files.push(filename);
    cursor = recordEnd;
  }
  assert(cursor === eocd, "ZIP central directory boundary mismatch");
  return files;
}
function audit(file) {
  const files = filenamesFromZip(file);
  const needed = [
    "extension/package.json", "extension/readme.md", "extension/LICENSE.txt",
    "extension/out/src/extension.js", "extension/media/saturivo-icon.png",
    "extension/media/activity.svg",
  ];
  const normalized = new Set(files.map(name => name.toLowerCase()));
  for (const name of needed) assert(normalized.has(name.toLowerCase()), "Missing required VSIX file: " + name);
  for (const name of files) {
    assert(!/^extension\/(?:\.git|\.github|node_modules|src|test|scripts)(?:\/|$)/i.test(name),
      "Disallowed development or workflow file shipped: " + name);
    assert(!/\/out\/test\//i.test(name), "Compiled test bundle leaked into VSIX: " + name);
    assert(!/\.cdx\.json$/i.test(name), "SBOM must be a separate evidence artifact, not bundled: " + name);
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
