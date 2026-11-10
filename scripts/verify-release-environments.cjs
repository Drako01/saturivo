"use strict";
const assert = require("node:assert/strict");

const REPO = "Drako01/saturivo";
const REQUIRED_ENVIRONMENTS = Object.freeze(["marketplace", "open-vsx", "github-release"]);

function inspectReleaseEnvironment(environment, branchPolicies) {
  assert(environment && REQUIRED_ENVIRONMENTS.includes(environment.name),
    "Unexpected or missing release environment");
  const review = (environment.protection_rules ?? []).find(rule =>
    rule.type === "required_reviewers");
  assert(review && Array.isArray(review.reviewers) && review.reviewers.length > 0,
    environment.name + ": a required human deployment reviewer must be configured");
  assert(environment.prevent_self_review !== true || review.reviewers.length > 1,
    environment.name + ": prevent-self-review requires an independent reviewer");
  const policy = environment.deployment_branch_policy;
  assert(policy?.custom_branch_policies === true && policy?.protected_branches === false,
    environment.name + ": restrict deployment to explicit main branch policy");
  assert(Array.isArray(branchPolicies) && branchPolicies.length === 1 &&
    branchPolicies[0]?.name === "main",
    environment.name + ": only the main branch may deploy");
}

async function github(path, token) {
  const response = await fetch("https://api.github.com/repos/" + REPO + "/" + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Saturivo-release-environments",
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("GitHub API " + response.status + " for " + path);
  return response.json();
}

async function verifyReleaseEnvironments(token) {
  assert(token, "Missing token for release environment governance verification");
  for (const name of REQUIRED_ENVIRONMENTS) {
    const base = "environments/" + name;
    const environment = await github(base, token);
    const policies = await github(base + "/deployment-branch-policies?per_page=100", token);
    inspectReleaseEnvironment(environment, policies.branch_policies);
    console.log("Release environment protected: " + name);
  }
}
if (require.main === module) {
  assert.equal(process.env.GITHUB_REPOSITORY, REPO, "Unexpected release repository");
  verifyReleaseEnvironments(process.env.GH_TOKEN).catch(error => {
    console.error("Release environment gate BLOCKED: " + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  });
}
module.exports = { inspectReleaseEnvironment, verifyReleaseEnvironments, REQUIRED_ENVIRONMENTS };
