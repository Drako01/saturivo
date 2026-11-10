"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { REQUIRED_JOBS } = require("../scripts/verify-merge-ci.cjs");
test("protect-main requires the exact seven CI jobs with strict status checking", () => {
  const ruleset = JSON.parse(fs.readFileSync(".github/rulesets/protect-main.json", "utf8"));
  const gate = ruleset.rules.find(rule => rule.type === "required_status_checks").parameters;
  assert.equal(gate.strict_required_status_checks_policy, true);
  assert.deepEqual(gate.required_status_checks.map(job => job.context).sort(),
    [...REQUIRED_JOBS].sort());
});
