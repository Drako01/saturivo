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

test("PR CI runs once and the merge to main triggers only the release workflow", () => {
  const root = path.join(__dirname, "..", ".github", "workflows");
  const ci = fs.readFileSync(path.join(root, "ci.yml"), "utf8");
  const pub = fs.readFileSync(path.join(root, "publish.yml"), "utf8");
  assert.match(ci, /^  pull_request:\s*$/m);
  assert.doesNotMatch(ci, /^  push:\s*$/m, "CI must never run again on main merge");
  assert.match(pub, /^  push:\s*\n    branches: \[main\]/m);
  assert.doesNotMatch(pub, /^    tags: /m, "Tag creation must not re-trigger publication");
  assert.match(pub, /^  workflow_dispatch:\s*$/m);
  assert.ok(pub.includes("run: node scripts/verify-merge-ci.cjs"));
  assert.ok(pub.includes("CONFIRMATION: ${{ inputs.confirmation }}"));
  assert.match(pub, /environment: marketplace/);
  assert.match(pub, /environment: open-vsx/);
});
test("publish reuses successful PR evidence and only builds/packages release artifacts", () => {
  const pub = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "publish.yml"), "utf8");
  assert.doesNotMatch(pub, /verify-platforms:/);
  assert.doesNotMatch(pub, /npm run verify:release/);
  assert.doesNotMatch(pub, /npm run verify\b/);
  assert.match(pub, /Build and package validated main tree/);
  assert.match(pub, /node scripts\/vsix-checksum\.cjs write saturivo\.vsix/);
  assert.match(pub, /^  release-tag:\s*$/m);
  assert.match(pub, /needs: \[authorize, package, release-tag\]/);
  assert.match(pub, /needs: \[authorize, package, release-tag, marketplace, open-vsx\]/);
});
test("release evidence gate is fail closed on missing, stale and failed exact PR checks", () => {
  const gate = require("../scripts/verify-merge-ci.cjs");
  const sha = "a".repeat(40), merge = "b".repeat(40);
  const pr = {number: 9, merged_at: "2026-11-07T00:00:00Z", merge_commit_sha: merge,
    base:{ref:"main"}, head:{sha}};
  assert.equal(gate.selectMergedPull([pr], merge).number, 9);
  assert.throws(() => gate.selectMergedPull([pr], sha));
  assert.throws(() => gate.selectMergedPull([], merge));
  assert.throws(() => gate.assertNewerVersion("0.2.1", "0.2.2"));
  assert.doesNotThrow(() => gate.assertNewerVersion("0.2.2", "0.2.1"));
  assert.throws(() => gate.validateCandidate({version:"0.2.2",preview:true}, "## [0.2.2] —"));
  gate.validateCandidate({version:"0.2.2"}, "## [0.2.2] — 2026-11-07");
  const good = {id:91,head_sha:sha,event:"pull_request",name:"CI",
    path:".github/workflows/ci.yml",status:"completed",conclusion:"success"};
  assert.equal(gate.successfulCiRun([good], sha).id, 91);
  assert.throws(() => gate.successfulCiRun([{...good,conclusion:"failure"}], sha));
  assert.throws(() => gate.successfulCiRun([{...good,head_sha:merge}], sha));
  const jobs = gate.REQUIRED_JOBS.map(name=>({name,head_sha:sha,status:"completed",conclusion:"success"}));
  gate.verifyCiJobs(jobs, sha);
  assert.throws(() => gate.verifyCiJobs(jobs.slice(1), sha));
  assert.throws(() => gate.verifyCiJobs(jobs.map((j,i)=>i===0?{...j,conclusion:"failure"}:j), sha));
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
