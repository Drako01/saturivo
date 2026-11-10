"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { assertMachineOnlyExecutableSettings } = require("../scripts/manifest-security.cjs");
const { inspectReleaseEnvironment, REQUIRED_ENVIRONMENTS } =
  require("../scripts/verify-release-environments.cjs");

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

test("all release environments fail closed without human approval and main-only policy", () => {
  assert.deepEqual(REQUIRED_ENVIRONMENTS, ["marketplace", "open-vsx", "github-release"]);
  for (const name of REQUIRED_ENVIRONMENTS) {
    const env = {
      name, protection_rules: [{ type: "required_reviewers", reviewers: [{ login: "Drako01" }] }],
      deployment_branch_policy: { custom_branch_policies: true, protected_branches: false },
      prevent_self_review: false,
    };
    const main = [{ name: "main" }];
    assert.doesNotThrow(() => inspectReleaseEnvironment(env, main));
    assert.throws(() => inspectReleaseEnvironment({ ...env, protection_rules: [] }, main), /reviewer/);
    assert.throws(() => inspectReleaseEnvironment(env, [{ name: "develop" }]), /main/);
    assert.throws(() => inspectReleaseEnvironment({ ...env,
      deployment_branch_policy: { custom_branch_policies: false } }, main), /main branch/);
  }
});
