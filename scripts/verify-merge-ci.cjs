"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");

const REQUIRED_JOBS = Object.freeze([
  "Verify (ubuntu-latest)", "Verify (windows-latest)", "Verify (macos-latest)",
  "Local k6 integration (Linux)", "Real VS Code Extension Host (Linux)",
  "Real Go race and pprof fixture (Linux)",
  "Control Center browser interactions (no screenshots)",
]);

function semverParts(value) {
  assert(/^\d+\.\d+\.\d+$/.test(value), "Release must use an exact numeric semver");
  return value.split(".").map(Number);
}
function assertNewerVersion(current, previous) {
  const a = semverParts(current), b = semverParts(previous);
  assert(a.some((n, i) => n !== b[i]), "Unchanged version cannot trigger publication");
  const firstDifference = a.findIndex((n, i) => n !== b[i]);
  assert(a[firstDifference] > b[firstDifference], "Release must increase the version");
}
function validateCandidate(pkg, changelog) {
  assert(!pkg.private, "Refuse publishing private package");
  assert(!Object.hasOwn(pkg, "preview"), "Release must not be Preview");
  semverParts(pkg.version);
  assert(changelog.includes("## [" + pkg.version + "] — "),
    "A dated, finalized changelog entry is required");
}
function selectMergedPull(pulls, mergeSha) {
  const matches = pulls.filter(p => p.merged_at &&
    p.merge_commit_sha === mergeSha && p.base?.ref === "main" && p.head?.sha);
  assert.equal(matches.length, 1,
    "Main push must be the exact squash merge of one approved PR");
  return matches[0];
}
function successfulCiRun(runs, headSha) {
  const candidates = runs.filter(r =>
    r.head_sha === headSha && r.event === "pull_request" &&
    r.name === "CI" && r.path === ".github/workflows/ci.yml")
    .sort((a, b) => b.id - a.id);
  assert(candidates.length > 0, "No CI run for the merged PR HEAD");
  const latest = candidates[0];
  assert(latest.status === "completed" && latest.conclusion === "success",
    "Latest PR CI on exact HEAD is not SUCCESS");
  return latest;
}
function verifyCiJobs(jobs, sha) {
  for (const name of REQUIRED_JOBS) {
    const matching = jobs.filter(j => j.name === name && j.head_sha === sha);
    assert(matching.length === 1 && matching[0].status === "completed" &&
      matching[0].conclusion === "success", "Required PR CI job not green: " + name);
  }
  assert(!jobs.some(j => j.conclusion === "failure" || j.conclusion === "cancelled"),
    "PR CI includes failed or cancelled jobs");
}

async function github(endpoint, token, repo) {
  const url = "https://api.github.com/repos/" + repo + "/" + endpoint;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Saturivo-release-evidence",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("GitHub API " + response.status + " for " + endpoint);
  return response.json();
}
function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function output(publish, version) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT,
    "publish=" + (publish ? "true" : "false") + "\n" +
    (publish ? "version=" + version + "\n" : ""));
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY, event = process.env.GITHUB_EVENT_NAME;
  const sha = process.env.GITHUB_SHA, token = process.env.GH_TOKEN;
  assert.equal(repo, "Drako01/saturivo", "Release repository mismatch");
  assert.equal(process.env.GITHUB_REF, "refs/heads/main", "Release must run on main");
  assert.equal(git("rev-parse", "HEAD"), sha, "Workflow checkout differs from GitHub SHA");
  assert(token, "Missing GitHub Actions token");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  validateCandidate(pkg, fs.readFileSync("CHANGELOG.md", "utf8"));

  if (event === "push") {
    const previousPkg = JSON.parse(git("show", "HEAD^:package.json"));
    if (previousPkg.version === pkg.version) {
      console.log("Version unchanged on main; no release triggered.");
      output(false);
      return;
    }
    assertNewerVersion(pkg.version, previousPkg.version);
    const pulls = await github("commits/" + sha + "/pulls", token, repo);
    const pull = selectMergedPull(pulls, sha);
    const originalSha = pull.head.sha;
    const original = await github("git/commits/" + originalSha, token, repo);
    assert.equal(original.tree.sha, git("rev-parse", "HEAD^{tree}"),
      "Squash merge tree differs from the PR HEAD verified by CI");
    const workflowRuns = await github(
      "actions/runs?head_sha=" + originalSha + "&event=pull_request&per_page=100",
      token, repo);
    const run = successfulCiRun(workflowRuns.workflow_runs || [], originalSha);
    const result = await github("actions/runs/" + run.id + "/jobs?per_page=100",
      token, repo);
    assert((result.total_count || 0) <= 100,
      "Unexpected CI job pagination; fail closed");
    verifyCiJobs(result.jobs || [], originalSha);
    console.log("Approved PR #" + pull.number + ": exact HEAD " + originalSha +
      ", CI run " + run.id + ", identical merge tree, all required jobs green.");
  } else if (event === "workflow_dispatch") {
    assert.equal(process.env.CONFIRMATION, "PUBLISH_SATURIVO",
      "Explicit manual publish confirmation missing");
    assert.equal(process.env.REQUEST_VERSION, pkg.version,
      "Manual publish version mismatch");
    const tag = await github("git/ref/tags/v" + pkg.version, token, repo);
    assert(tag.object?.type === "commit" && tag.object?.sha === sha,
      "Manual recovery requires existing protected tag on exact main commit");
  } else {
    throw new Error("Only push to main or confirmed workflow_dispatch can publish");
  }
  // Do not republish the same version. The tag job verifies/creates the immutable ref.
  try {
    const release = await github("releases/tags/v" + pkg.version, token, repo);
    if (release?.id) {
      console.log("GitHub Release v" + pkg.version + " already exists; skipping.");
      output(false);
      return;
    }
  } catch (error) {
    if (!String(error.message).includes("GitHub API 404")) throw error;
  }
  output(true, pkg.version);
  console.log("Automated release authorized for " + pkg.version + ".");
}
if (require.main === module) {
  main().catch(error => {
    console.error("Release gate BLOCKED: " + String(error.message || error));
    process.exitCode = 1;
  });
}
module.exports = {
  REQUIRED_JOBS, assertNewerVersion, validateCandidate, selectMergedPull,
  successfulCiRun, verifyCiJobs,
};
