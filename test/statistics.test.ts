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
let trialSequence = 0;
const runs = (values: number[]): RunResult[] => {
  const sequence = ++trialSequence;
  return values.map((p95, i) =>
    ({ ...example, id: "run-" + sequence + "-" + i, metrics: { ...example.metrics, p95Ms: p95 } }));
};
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

test("duplicate trials and missing or mismatched environment identities are inconclusive", () => {
  const baseline = runs([100, 101, 99]);
  const candidate = runs([150, 151, 149]);
  const duplicates = compareTrialGroups(baseline, [...baseline]);
  assert.equal(duplicates.status, "inconclusive");
  assert.match(duplicates.reasons.join(" "), /Duplicate run IDs/);
  const a = baseline.map(run => ({ ...run, environment: { ...run.environment,
    environmentHash: "a".repeat(64) } }));
  const differentHost = candidate.map(run => ({ ...run, environment: { ...run.environment,
    environmentHash: "b".repeat(64) } }));
  assert.equal(compareTrialGroups(a, differentHost).status, "inconclusive");
  assert.equal(compareTrialGroups(a, candidate).status, "inconclusive");
  const sameHost = candidate.map(run => ({ ...run, environment: { ...run.environment,
    environmentHash: "a".repeat(64) } }));
  assert.equal(compareTrialGroups(a, sameHost).status, "regression");
});

test("bootstrap classifications are inconclusive when any trial reaches the request budget", () => {
  const a = runs([100, 100, 100]).map(run => ({
    ...run, scenario: { ...run.scenario, maxRequests: 1000 },
    metrics: { ...run.metrics, requests: 999 },
  }));
  const b = runs([150, 150, 150]).map((run, index) => ({
    ...run, scenario: { ...run.scenario, maxRequests: 1000 },
    metrics: { ...run.metrics, requests: index === 1 ? 1000 : 999 },
  }));
  const result = compareTrialGroups(a, b);
  assert.equal(result.status, "inconclusive");
  assert.match(result.reasons.join(" "), /Request budget reached/);
  const gc = compareTrialGroups(a, b.map(run => ({
    ...run, metrics: { ...run.metrics, requests: 850, totalRequests: 1000 },
  })));
  assert.equal(gc.status, "inconclusive");
  assert.match(gc.reasons.join(" "), /Request budget reached/);
});

test("seeded repeatability: bounded identical noise is rarely misclassified as a regression", () => {
  // A deterministic fixture-level risk probe, not a production false-positive guarantee.
  let seed = 0x31415926;
  const random = (): number => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const noisy = (offset: number): number[] =>
    Array.from({ length: 3 }, () => 100 + offset + 25 * (2 * random() - 1));
  let falseClaims = 0;
  let detectedRegressions = 0;
  const rounds = 64;
  for (let i = 0; i < rounds; i++) {
    const before = runs(noisy(0));
    const after = runs(noisy(0));
    const control = compareTrialGroups(before, after);
    if (control.status === "regression" || control.status === "improvement") falseClaims++;
    // A separately seeded, intentionally delayed group should still produce evidence.
    const worse = compareTrialGroups(before, runs(noisy(60)));
    if (worse.status === "regression") detectedRegressions++;
  }
  assert(falseClaims <= 4,
    "Excess false claims on unchanged noisy synthetic fixtures: " + falseClaims + "/" + rounds);
  assert(detectedRegressions >= 56,
    "Excess missed regressions with synthetic +60 ms latency: " + detectedRegressions + "/" + rounds);
});
