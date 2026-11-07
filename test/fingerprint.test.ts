import { test } from "node:test";
import { strict as assert } from "node:assert";
import { fingerprintScenario } from "../src/core/fingerprint";
import { markdownReport } from "../src/core/report";
import { compareRuns } from "../src/core/comparison";
import type { RunResult, Scenario } from "../src/core/types";

const scenario: Scenario = {
  id: "baseline", name: "Baseline", target: "http://127.0.0.1:8080/",
  method: "GET", model: "constant-vus", durationSeconds: 10, virtualUsers: 5,
};
function run(input: Scenario, scenarioHash?: string): RunResult {
  return {
    schemaVersion: 1, id: "run", engine: "k6",
    scenario: input, ...(scenarioHash ? { scenarioHash } : {}),
    startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
    metrics: { requests: 200, requestsPerSecond: 20, failedRate: 0,
      avgMs: 10, p50Ms: 8, p95Ms: 15, p99Ms: 20, droppedIterations: 0 },
    environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
    warnings: [],
  };
}
test("stable workload SHA-256 excludes presentation-only identity", () => {
  const sha = fingerprintScenario(scenario);
  assert.match(sha, /^[0-9a-f]{64}$/);
  assert.equal(sha, fingerprintScenario({ ...scenario, id: "renamed", name: "Again" }));
  assert.notEqual(sha, fingerprintScenario({ ...scenario, virtualUsers: 6 }));
  assert.notEqual(sha, fingerprintScenario({ ...scenario, target: "http://127.0.0.1:8081/" }));
  assert.notEqual(sha, fingerprintScenario({ ...scenario, method: "HEAD" }));
  assert.notEqual(sha, fingerprintScenario({ ...scenario, model: "constant-arrival-rate", arrivalRate: 25 }));
});
test("legacy reports remain comparable, mismatched stored fingerprint is inconclusive", () => {
  const oldRun = run(scenario); // no scenarioHash, historical schema v1
  const newRun = run(scenario, fingerprintScenario(scenario));
  assert.equal(compareRuns(oldRun, newRun).status, "stable");
  assert.equal(compareRuns(oldRun, run(scenario, "f".repeat(64))).status, "inconclusive");
  assert.match(markdownReport(oldRun), new RegExp(fingerprintScenario(scenario)));
});

test("v2 ramp stages participate in the stable workload fingerprint", () => {
  const ramp: Scenario = {
    ...scenario, model: "ramping-vus", workloadVersion: 2, durationSeconds: 20,
    stages: [{ durationSeconds: 10, targetVus: 3 }, { durationSeconds: 10, targetVus: 0 }],
  };
  assert.notEqual(fingerprintScenario(ramp), fingerprintScenario({
    ...ramp, stages: [{ durationSeconds: 10, targetVus: 4 }, { durationSeconds: 10, targetVus: 0 }],
  }));
  assert.equal(fingerprintScenario(ramp), fingerprintScenario({ ...ramp, id: "other", name: "Other" }));
});

test("Markdown report retains ordinary letters and redacts sensitive query strings", () => {
  const exposed = run({ ...scenario, name: "Concurrent runners",
    target: "http://127.0.0.1:8080/health?api_key=DO_NOT_LEAK&token=secret" });
  const rendered = markdownReport(exposed);
  assert.match(rendered, /Concurrent runners/);
  assert(rendered.includes("health?\\\\[query redacted\\\\]"));
  assert.doesNotMatch(rendered, /DO_NOT_LEAK|token=secret/);
  assert.match(rendered, /scenario SHA identifies the original workload/);
});

test("v4 measurement phases change identity but preserve pre-phase v2 workload hashes", () => {
  const old: Scenario = { ...scenario, workloadVersion: 2 };
  assert.equal(fingerprintScenario(old), fingerprintScenario({
    ...old, warmupSeconds: 0, cooldownSeconds: 0,
  }));
  const measured: Scenario = { ...old, warmupSeconds: 2, cooldownSeconds: 3 };
  assert.notEqual(fingerprintScenario(old), fingerprintScenario(measured));
  assert.notEqual(fingerprintScenario(measured), fingerprintScenario({
    ...measured, warmupSeconds: 3, cooldownSeconds: 2,
  }));
  assert.match(markdownReport(run(measured)), /Measured window: 5 seconds/);
});
