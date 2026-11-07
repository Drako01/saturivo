import { test } from "node:test";
import { strict as assert } from "node:assert";
import { assessSlo, assertValidSlo } from "../src/core/slo";
import { validateScenario } from "../src/core/validation";
import { fingerprintScenario } from "../src/core/fingerprint";
import type { Metrics, Scenario } from "../src/core/types";
const metrics: Metrics = {
  requests: 1000, requestsPerSecond: 100, failedRate: 0.01,
  avgMs: 15, p50Ms: 10, p95Ms: 25, p99Ms: 40, droppedIterations: 0,
};
const base: Scenario = {
  id: "smoke", name: "Smoke", target: "http://127.0.0.1:8080/",
  method: "GET", model: "constant-vus", durationSeconds: 10, virtualUsers: 1,
};
test("explicit SLO PASS/FAIL/INCONCLUSIVE and absent policy", () => {
  assert.equal(assessSlo(metrics).status, "not-configured");
  assert.equal(assessSlo(metrics, { maxP95Ms: 30, maxErrorPercent: 2 }).status, "pass");
  assert.equal(assessSlo(metrics, { maxP95Ms: 20 }).status, "fail");
  assert.equal(assessSlo(metrics, { maxP99Ms: 30 }).status, "fail");
  assert.equal(assessSlo(metrics, { minThroughputRps: 120 }).status, "fail");
  assert.equal(assessSlo({ ...metrics, requests: 80 }, { maxP95Ms: 30 }).status, "inconclusive");
  assert.equal(assessSlo({ ...metrics, droppedIterations: 5 }, { maxP95Ms: 30 }).status, "inconclusive");
});
test("SLO bounds reject impossible thresholds", () => {
  assert.throws(() => assertValidSlo({ maxP95Ms: Number.NaN }), /Invalid SLO/);
  assert.throws(() => assertValidSlo({ maxErrorPercent: 101 }), /Invalid SLO/);
  assert.throws(() => assertValidSlo({}), /must specify/);
  assert.throws(() => validateScenario({ ...base, slo: { maxP95Ms: -1 } },
    { maxVirtualUsers: 100, allowRemoteTargets: false }), /Invalid SLO/);
});
test("SLO configuration changes scenario hash but preserves legacy v1 hash", () => {
  assert.equal(fingerprintScenario(base), fingerprintScenario({ ...base, name: "new label" }));
  assert.notEqual(fingerprintScenario(base), fingerprintScenario({ ...base, slo: { maxP95Ms: 50 } }));
  assert.notEqual(fingerprintScenario({ ...base, slo: { maxP95Ms: 50 } }),
    fingerprintScenario({ ...base, slo: { maxP95Ms: 100 } }));
});
