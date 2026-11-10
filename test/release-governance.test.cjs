"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { assertMachineOnlyExecutableSettings } = require("../scripts/manifest-security.cjs");
const {
  inspectReleasePolicy, inspectWorkflow, REQUIRED_ENVIRONMENTS, githubBranch,
} = require("../scripts/verify-release-policy.cjs");

test("hostile workspace cannot control executable path through contribution schema", () => {
  const packageJson = require("../package.json");
  assert.doesNotThrow(() => assertMachineOnlyExecutableSettings(packageJson));
  const hostile = structuredClone(packageJson);
  delete hostile.contributes.configuration.properties["saturivo.k6Path"].scope;
  assert.throws(() => assertMachineOnlyExecutableSettings(hostile), /machine-scoped/);
  hostile.contributes.configuration.properties["saturivo.k6Path"].scope = "machine";
  hostile.contributes.configuration.properties["saturivo.otherExecutable"] =
    { type: "string", default: "evil" };
  assert.throws(() => assertMachineOnlyExecutableSettings(hostile), /machine-scoped/);
});

const workflow = fs.readFileSync(
  path.join(__dirname, "..", ".github", "workflows", "publish.yml"), "utf8");
const sha = "a".repeat(40);
const context = { repository: "Drako01/saturivo", ref: "refs/heads/main", sha, eventName: "push" };
const protectedMain = { name: "main", protected: true, commit: { sha } };

test("solo owner can release from protected main without a second deployment reviewer", () => {
  assert.deepEqual(REQUIRED_ENVIRONMENTS, ["marketplace", "open-vsx", "github-release"]);
  assert.equal(inspectReleasePolicy(context, protectedMain, workflow), true);
  assert.equal(inspectReleasePolicy({ ...context, eventName: "workflow_dispatch" }, protectedMain, workflow), true);
  assert.doesNotMatch(workflow, /verify-release-environments\.cjs|required human review/i);
  assert.throws(() => inspectReleasePolicy({ ...context, repository: "evil/fork" }, protectedMain, workflow), /repository/);
  assert.throws(() => inspectReleasePolicy({ ...context, ref: "refs/heads/feature" }, protectedMain, workflow), /main/);
  assert.throws(() => inspectReleasePolicy({ ...context, sha: "oops" }, protectedMain, workflow), /SHA/);
  assert.throws(() => inspectReleasePolicy({ ...context, eventName: "pull_request" }, protectedMain, workflow), /event/);
  assert.throws(() => inspectReleasePolicy(context, { ...protectedMain, protected: false }, workflow), /not protected/);
  assert.throws(() => inspectReleasePolicy(context, { ...protectedMain, commit: { sha: "b".repeat(40) } }, workflow), /changed/);
});

test("workflow retains exact PR evidence and all required OIDC environments", () => {
  assert.equal(inspectWorkflow(workflow), true);
  assert.equal(inspectWorkflow(workflow.replace(/\n/g, "\r\n")), true,
    "Windows CRLF checkout must preserve the release policy");
  for (const tampered of [
    workflow.replace("    environment: marketplace", "    environment: marketplace-unsafe"),
    workflow.replace("    environment: open-vsx", "    environment: generic"),
    workflow.replace("    environment: github-release", "    environment: generic"),
    workflow.replace("run: node scripts/verify-merge-ci.cjs", "run: echo skip"),
    workflow.replace("run: node scripts/verify-release-policy.cjs", "run: echo skip"),
    workflow.replace("    branches: [main]", "    branches: [develop]"),
    workflow.replace("  push:", "  pull_request:"),
  ]) assert.throws(() => inspectWorkflow(tampered));
});

test("protected-main branch query fails closed without token or on HTTP errors", async () => {
  await assert.rejects(githubBranch(null), /token/);
  await assert.rejects(githubBranch("synthetic", async () => ({ ok: false, status: 403 })), /403/);
  const branch = await githubBranch("synthetic", async (_url, options) => {
    assert.match(options.headers.Authorization, /^Bearer /);
    return { ok: true, json: async () => protectedMain };
  });
  assert.equal(branch.protected, true);
});
