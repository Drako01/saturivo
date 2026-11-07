"use strict";
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function writeManifest(vsix, revision, version, out = "saturivo.release.json") {
  if (!/^[a-f0-9]{40}$/i.test(revision)) throw new Error("Invalid source SHA");
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid semver");
  const report = { schemaVersion: 1, extension: "armotusitio.saturivo",
    version, revision: revision.toLowerCase(), filename: path.basename(vsix), sha256: sha256(vsix) };
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
  return report;
}
function verifyManifest(vsix, revision, version, source = "saturivo.release.json") {
  if (fs.statSync(source).size > 4096) throw new Error("Oversized release manifest");
  const manifest = JSON.parse(fs.readFileSync(source, "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.extension, "armotusitio.saturivo");
  assert.equal(manifest.version, version);
  assert.equal(manifest.revision, revision.toLowerCase());
  assert.equal(manifest.filename, path.basename(vsix));
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
  assert.equal(sha256(vsix), manifest.sha256, "VSIX changed after verification");
  return manifest;
}
if (require.main === module) {
  try {
    const [cmd, vsix, sha, version] = process.argv.slice(2);
    if (!vsix || !sha || !version) throw new Error("Usage: release-manifest.cjs write|check VSIX COMMIT_SHA VERSION");
    const out = cmd === "write" ? writeManifest(vsix, sha, version) :
      cmd === "check" ? verifyManifest(vsix, sha, version) : (() => {throw new Error("Invalid command");})();
    console.log("Release manifest " + cmd + ": " + out.version + " " + out.sha256);
  } catch (e) {console.error(e); process.exitCode = 1;}
}
module.exports = { writeManifest, verifyManifest };
