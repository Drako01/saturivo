"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

function digest(file) {
  const size = fs.statSync(file).size;
  if (size < 1 || size > 25_000_000) throw new Error("VSIX must be 1B–25MB");
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function run() {
  const mode = process.argv[2], file = process.argv[3] ?? "saturivo.vsix";
  if (!["write", "check"].includes(mode)) throw new Error("Usage: vsix-checksum.cjs write|check <file> [--expect SHA256]");
  const actual = digest(file), sumFile = file + ".sha256";
  if (mode === "write") {
    fs.writeFileSync(sumFile, actual + "  " + path.basename(file) + "\n", { flag: "w", mode: 0o600 });
  } else {
    const match = /^([0-9a-f]{64})\s+\S+$/i.exec(fs.readFileSync(sumFile, "utf8").trim());
    assert(match, "Malformed checksum sidecar");
    assert.equal(actual, match[1].toLowerCase(), "Packaged VSIX digest mismatch");
  }
  const expectedAt = process.argv.indexOf("--expect");
  if (expectedAt >= 0) {
    const expected = process.argv[expectedAt + 1];
    if (!/^[0-9a-f]{64}$/i.test(expected ?? "")) throw new Error("Invalid expected SHA-256");
    assert.equal(actual, expected.toLowerCase(), "VSIX differs from release-approved artifact");
  }
  console.log("Saturivo VSIX SHA-256: " + actual);
}
try { run(); } catch (error) { console.error(error); process.exitCode = 1; }
