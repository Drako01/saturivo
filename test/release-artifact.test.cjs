"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { writeManifest, verifyManifest } = require("../scripts/release-manifest.cjs");
const candidateVersion = require("../package.json").version;
test("the exact VSIX is bound to an immutable SHA, version and manifest", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-release-"));
  try {
    const file = path.join(dir, "saturivo.vsix");
    const record = path.join(dir, "manifest.json");
    const source = "a".repeat(40);
    fs.writeFileSync(file, "synthetic VSIX fixture");
    const created = writeManifest(file, source, candidateVersion, record);
    assert.match(created.sha256, /^[0-9a-f]{64}$/);
    verifyManifest(file, source, candidateVersion, record);
    assert.throws(() => verifyManifest(file, "b".repeat(40), candidateVersion, record));
    assert.throws(() => verifyManifest(file, source, "0.1.0", record));
    fs.appendFileSync(file, "tampered");
    assert.throws(() => verifyManifest(file, source, candidateVersion, record), /changed/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("publication is not triggered by a plain merge into main", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "publish.yml"), "utf8");
  assert.match(workflow, /^\s{4}tags: \['v\*'\]$/m);
  assert.doesNotMatch(workflow, /^\s{4}branches: \[main\]$/m);
  assert.match(workflow, /^  workflow_dispatch:$/m);
  assert.ok(workflow.includes("CONFIRMATION: ${{ inputs.confirmation }}"));
  assert.match(workflow, /environment: marketplace/);
  assert.match(workflow, /environment: open-vsx/);
});

test("GitHub Release verification downloads VSIX with its checksum sidecar, even on retry", () => {
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "publish.yml"), "utf8");
  const releaseStep = workflow.split("      - name: Create GitHub Release using already approved protected tag")[1];
  assert.ok(releaseStep, "Expected GitHub Release verification step");
  assert.ok(releaseStep.includes("gh release download \"$tag\" --pattern 'saturivo.vsix*' --dir verify"),
    "Download both saturivo.vsix and saturivo.vsix.sha256");
  assert.match(releaseStep, /check verify\/saturivo\.vsix --expect/);
  assert.match(releaseStep, /if gh release view "\$tag"[\s\S]*?\n\s*else\n[\s\S]*?\n\s*fi\n[\s\S]*?gh release download/);
  assert.doesNotMatch(releaseStep, /GitHub Release \$tag exists, no mutation\.[\s\S]*?exit 0/);
});
