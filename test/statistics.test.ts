import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compareTrialGroups } from "../src/core/statistics";
import type { RunResult } from "../src/core/types";
const example: RunResult = {
  schemaVersion: 1, id: "run", engine: "k6",
  startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
  scenario: { id: "stress", name: "Stress", target: "http://127.0.0.1:8080/",
    method: "GET", model: "constant-vus", virtualUsers: 10, durationSeconds: 10 },
  metrics: { requests: 1000, requestsPerSecond: 100, failedRate: 0,
    avgMs: 40, p50Ms: 30, p95Ms: 100, p99Ms: 120, droppedIterations: 0 },
  environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8,
    cpuModel: "Fixture CPU", k6Version: "k6 v1.8.2" }, warnings: [],
};
const runs = (values: number[]): RunResult[] => values.map((p95, i) =>
  ({ ...example, id: "run" + i, metrics: { ...example.metrics, p95Ms: p95 } }));
test("detects clear reproducible P95 regressions and improvements", () => {
  const a = runs([100, 101, 99]), b = runs([150, 151, 149]);
  const worse = compareTrialGroups(a, b);
  assert.equal(worse.status, "regression");
  assert(worse.ciLowerPercent > 10);
  assert.deepEqual(worse, compareTrialGroups(a, b)); // seeded bootstrap
  assert.equal(compareTrialGroups(b, a).status, "improvement");
});
test("equal fixtures stabilize; noisy or insufficient trials remain inconclusive", () => {
  assert.equal(compareTrialGroups(runs([100, 100, 100]), runs([100, 100, 100])).status, "stable");
  assert.equal(compareTrialGroups(runs([100, 140, 60]), runs([110, 120, 95])).status, "inconclusive");
  assert.equal(compareTrialGroups(runs([100]), runs([150])).status, "inconclusive");
});
test("rejects different host/runtime and dropped arrivals", () => {
  const a = runs([100, 100, 100]);
  const b = runs([150, 150, 150]);
  b[0] = { ...example, metrics: { ...example.metrics, p95Ms: 150 },
    environment: { ...example.environment, cpuCount: 16 } };
  assert.equal(compareTrialGroups(a, b).status, "inconclusive");
  assert.equal(compareTrialGroups(a, runs([150, 150, 150]).map(run => ({
    ...run, metrics: { ...run.metrics, droppedIterations: 2 },
  }))).status, "inconclusive");
});
