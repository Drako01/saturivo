import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compareRuns } from "../src/core/comparison";
import type { RunResult } from "../src/core/types";

const base: RunResult = {
  schemaVersion: 1, id: "a", engine: "k6", startedAt: "2026-11-07T00:00:00Z",
  endedAt: "2026-11-07T00:01:00Z",
  scenario: { id: "stress", name: "Stress", target: "http://127.0.0.1:8080/",
    method: "GET", model: "constant-vus", virtualUsers: 10, durationSeconds: 10 },
  metrics: { requests: 1000, requestsPerSecond: 100, failedRate: 0,
    avgMs: 40, p50Ms: 30, p95Ms: 100, p99Ms: 120, droppedIterations: 0 },
  environment: { platform: "win32", arch: "x64", node: "v22", cpuCount: 8 },
  warnings: [],
};
test("regression, improvement and stable classifications", () => {
  assert.equal(compareRuns(base, { ...base, metrics: { ...base.metrics, p95Ms: 130 } }).status, "regression");
  assert.equal(compareRuns(base, { ...base, metrics: { ...base.metrics, p95Ms: 70 } }).status, "improvement");
  assert.equal(compareRuns(base, { ...base, metrics: { ...base.metrics, p95Ms: 103 } }).status, "stable");
});
test("do not compare unlike workloads or tiny samples", () => {
  assert.equal(compareRuns(base, { ...base, scenario: { ...base.scenario, virtualUsers: 20 } }).status, "inconclusive");
  assert.equal(compareRuns(base, { ...base, metrics: { ...base.metrics, requests: 50 } }).comparable, false);
  assert.equal(compareRuns(base, { ...base, environment: { ...base.environment, cpuCount: 16 } }).status, "inconclusive");
});

test("one-sided environment evidence cannot establish a comparable baseline", () => {
  const newer = { ...base, id: "b", environment: { ...base.environment,
    environmentHash: "a".repeat(64) } };
  assert.equal(compareRuns(base, newer).status, "inconclusive");
});

test("request-capped workloads cannot be classified as throughput regressions or improvements", () => {
  const bounded: RunResult = { ...base, scenario: { ...base.scenario, maxRequests: 1000 },
    metrics: { ...base.metrics, requests: 950 } };
  const capped: RunResult = { ...bounded, id: "b",
    metrics: { ...bounded.metrics, requests: 1000, p95Ms: 160,
      requestsPerSecond: 20 } };
  const comparison = compareRuns(bounded, capped);
  assert.equal(comparison.status, "inconclusive");
  assert.equal(comparison.comparable, false);
  assert.match(comparison.reasons.join(" "), /Request budget reached/);
  const phased = compareRuns(bounded, { ...capped,
    metrics: { ...capped.metrics, requests: 750, totalRequests: 1000 } });
  assert.equal(phased.status, "inconclusive");
  assert.match(phased.reasons.join(" "), /Request budget reached/);
});

test("dropped load and inconclusive SLO cannot produce an apparently stable comparison", () => {
  const dropped: RunResult = { ...base, id: "b",
    metrics: { ...base.metrics, droppedIterations: 1 } };
  assert.equal(compareRuns(base, dropped).status, "inconclusive");
  assert.match(compareRuns(base, dropped).reasons.join(" "), /Dropped/);
  const inconclusive: RunResult = { ...base, id: "c",
    sloAssessment: { status: "inconclusive", violations: [] } };
  assert.equal(compareRuns(base, inconclusive).status, "inconclusive");
});
