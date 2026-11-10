"use strict";
/**
 * Solo-maintainer release preflight.
 * verify-merge-ci.cjs independently requires the exact merged PR SHA,
 * identical squash tree, seven successful jobs and an increasing version.
 *
 * GitHub Environments reviewer/branch-policy administration is optional.
 * The names remain in the publish workflow for OIDC identity isolation.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO = "Drako01/saturivo";
const REQUIRED_ENVIRONMENTS = Object.freeze(["marketplace", "open-vsx", "github-release"]);

function jobBlock(source, job) {
  const marker = "\n  " + job + ":\n";
  const start = source.indexOf(marker, source.indexOf("\njobs:\n"));
  assert(start >= 0, "Missing publish job: " + job);
  const tail = source.slice(start + marker.length);
  const end = tail.search(/^  [a-z][a-z0-9-]*:\s*$/m);
  return end < 0 ? tail : tail.slice(0, end);
}

function inspectWorkflow(source) {
  // Windows checkout may use CRLF; inspect the same logical YAML everywhere.
  source = source.replace(/\r+\n/g, "\n");
  assert.match(source, /^on:\s*\n  push:\s*\n    branches: \[main\]/m,
    "Publish must trigger on main only");
  assert.doesNotMatch(source, /^  pull_request:/m,
    "Do not publish directly from pull requests");
  const authorize = jobBlock(source, "authorize");
  assert.match(authorize, /run: node scripts\/verify-merge-ci\.cjs/,
    "Must require exact green PR SHA and seven jobs");
  assert.match(authorize, /run: node scripts\/verify-release-policy\.cjs/,
    "Must require protected main release gate");
  assert.match(jobBlock(source, "release-tag"), /needs: \[authorize, package\]/,
    "Tag requires authorized release artifacts");
  for (const [job, environment] of [
    ["marketplace", "marketplace"],
    ["open-vsx", "open-vsx"],
    ["github-release", "github-release"],
  ]) {
    assert(REQUIRED_ENVIRONMENTS.includes(environment), "Unknown environment");
    const section = jobBlock(source, job);
    assert.match(section, new RegExp("^    environment: " + environment + "\\s*$", "m"),
      "Missing OIDC environment for " + job);
    assert.match(section, /needs: \[authorize, package, release-tag/,
      "Publisher must depend on authorized tag and package: " + job);
    if (job !== "github-release") {
      assert.match(section, /^      id-token: write$/m,
        "Registry publisher requires an environment-scoped OIDC token");
    }
  }
  return true;
}

function inspectReleasePolicy(context, mainBranch, workflow) {
  assert.equal(context.repository, REPO, "Release repository mismatch");
  assert.equal(context.ref, "refs/heads/main", "Release restricted to main");
  assert(["push", "workflow_dispatch"].includes(context.eventName),
    "Unsupported release event");
  assert.match(context.sha || "", /^[0-9a-f]{40}$/, "Missing full release SHA");
  assert.equal(mainBranch?.name, "main", "Protected main metadata missing");
  assert.equal(mainBranch?.protected, true, "Main is not protected");
  assert.equal(mainBranch?.commit?.sha, context.sha,
    "Main SHA changed during authorization");
  inspectWorkflow(workflow);
  return true;
}

async function githubBranch(token, apiFetch = fetch) {
  assert(token, "Missing GitHub Actions token");
  const response = await apiFetch("https://api.github.com/repos/" + REPO + "/branches/main", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Saturivo-solo-owner-release-policy",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Protected main API " + response.status);
  return response.json();
}

async function verifyReleasePolicy(token, context = process.env, apiFetch = fetch) {
  const main = await githubBranch(token, apiFetch);
  const workflow = fs.readFileSync(
    path.join(__dirname, "..", ".github", "workflows", "publish.yml"), "utf8");
  inspectReleasePolicy({
    repository: context.GITHUB_REPOSITORY,
    ref: context.GITHUB_REF,
    sha: context.GITHUB_SHA,
    eventName: context.GITHUB_EVENT_NAME,
  }, main, workflow);
  console.log("Solo-maintainer release gate PASS: protected main, exact SHA, and OIDC environment bindings.");
}

if (require.main === module) {
  verifyReleasePolicy(process.env.GH_TOKEN).catch(error => {
    console.error("Release policy BLOCKED: " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
module.exports = {
  inspectReleasePolicy, inspectWorkflow, verifyReleasePolicy, githubBranch, REQUIRED_ENVIRONMENTS,
};
