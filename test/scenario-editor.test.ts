import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseScenarioEditorInput } from "../src/core/scenario-editor";
import { fingerprintScenario } from "../src/core/fingerprint";

const policy = { allowRemoteTargets: false, maxVirtualUsers: 30, maxRequests: 2000 };
const target = "http://127.0.0.1:8080/health";
const input: Record<string, string> = {
  name: "My load", method: "GET", model: "constant-vus",
  durationSeconds: "10", virtualUsers: "5", arrivalRate: "10",
  maxRequests: "1000", maxP95Ms: "250",
};

test("v2 editor produces a validated, fingerprinted, bounded closed-loop scenario", () => {
  const scenario = parseScenarioEditorInput(input, target, policy);
  assert.equal(scenario.target, target);
  assert.equal(scenario.workloadVersion, 2);
  assert.equal(scenario.slo?.maxP95Ms, 250);
  assert.equal(scenario.arrivalRate, undefined);
  assert.match(fingerprintScenario(scenario), /^[a-f0-9]{64}$/);
});

test("v2 editor accepts a bounded open-loop scenario", () => {
  const scenario = parseScenarioEditorInput({ ...input, model: "constant-arrival-rate",
    arrivalRate: "45", method: "HEAD", maxP95Ms: "0" }, target, policy);
  assert.equal(scenario.arrivalRate, 45);
  assert.equal(scenario.method, "HEAD");
  assert.equal(scenario.slo, undefined);
});

test("editor payload cannot override policy or target, inject models or unsafe integers", () => {
  assert.equal(parseScenarioEditorInput({ ...input,
    target: "http://169.254.169.254/", allowRemoteTargets: true }, target, policy).target, target);
  for (const dangerous of ["-1", "1e3", "1.5", "0x20", "Infinity", "9999999", "", " 3"]) {
    assert.throws(() => parseScenarioEditorInput({ ...input, virtualUsers: dangerous },
      target, policy));
  }
  assert.throws(() => parseScenarioEditorInput({ ...input, maxRequests: "2001" },
    target, policy), /request budget/i);
  assert.throws(() => parseScenarioEditorInput({ ...input, model: "ramping-vus" },
    target, policy), /Unsupported editor load model/);
  assert.throws(() => parseScenarioEditorInput({ ...input, method: "POST" },
    target, policy), /GET and HEAD/);
  assert.throws(() => parseScenarioEditorInput({ ...input, durationSeconds: "121" },
    target, policy), /Duration/);
  assert.throws(() => parseScenarioEditorInput(null, target, policy), /Invalid scenario/);
  assert.throws(() => parseScenarioEditorInput({ ...input, name: "<".repeat(81) },
    target, policy), /Scenario name/);
  assert.throws(() => parseScenarioEditorInput(input, "http://example.com/", policy),
    /Remote targets/);
});

test("legacy v1 remains valid; v2 changes the explicit workload identity", () => {
  const latest = parseScenarioEditorInput(input, target, policy);
  const { workloadVersion: _version, ...legacy } = latest;
  assert.notEqual(fingerprintScenario(legacy), fingerprintScenario(latest));
});
