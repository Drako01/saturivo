import { test } from "node:test";
import { strict as assert } from "node:assert";
import { markdownReport } from "../src/core/report";
import type { RunResult, Comparison } from "../src/core/types";
import type { StatisticalComparison } from "../src/core/statistics";

const run: RunResult = {
  id: "11111111-1111-4111-8111-111111111111", schemaVersion: 2,
  engine: "k6", startedAt: "2026-11-10T10:00:00Z", endedAt: "2026-11-10T10:00:10Z",
  scenario: { id: "profile", name: "Measured", target: "http://127.0.0.1:8080/",
    model: "constant-arrival-rate", method: "HEAD", virtualUsers: 2,
    durationSeconds: 20, workloadVersion: 2, warmupSeconds: 3, cooldownSeconds: 4,
    arrivalRate: 8, maxRequests: 1000 },
  metrics: { requests: 25, totalRequests: 37, requestsPerSecond: 2.5, failedRate: 0,
    avgMs: 2, p50Ms: 1, p95Ms: 3, p99Ms: 4, droppedIterations: 0,
    targetArrivalRate: 8, achievedArrivalRate: 7,
    statusDistribution: { "1xx": 0, "2xx": 25, "3xx": 0,
      "4xx": 0, "5xx": 0, unknown: 0 } },
  environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8,
    k6Version: "1.8.2", cpuModel: "test", environmentHash: "a".repeat(64),
    loadHostFingerprint: "b".repeat(64), gitSha: "c".repeat(40) },
  sloAssessment: { status: "fail", violations: ["failed > baseline"] },
  warnings: ["Known load caveat"],
};
const comparison: Comparison = {
  status: "regression", comparable: true, reasons: ["Different host"], deltaP95Percent: 20,
  deltaRpsPercent: -10, deltaFailedPercentagePoints: 1,
};
const trials: StatisticalComparison = {
  method: "bootstrap-median-p95-v1", status: "regression", reasons: ["High variance"],
  baselineRuns: 3, candidateRuns: 3, deltaPercent: 21,
  ciLowerPercent: 13, ciUpperPercent: 32,
};
test("report preserves evidence for phases, arrivals, status classes, SLO and reproducible comparisons", () => {
  const value = markdownReport(run, comparison, trials);
  for (const expected of ["Warm-up: 3 seconds", "Measured window: 13 seconds",
    "Cool-down: 4 seconds", "Total HTTP requests (all phases)",
    "Requested arrivals", "Observed HTTP arrivals", "HTTP 2xx",
    "Execution environment", "Host fingerprint SHA-256", "Source revision",
    "SLO findings", "Relative comparison", "Repeated trials",
    "95% interval", "Known load caveat", "not a guarantee of production capacity"]) {
    assert(value.includes(expected), "Missing report evidence: " + expected);
  }
});
test("report produces explicit numeric unavailability and comparison caveat fallback", () => {
  const incomplete: RunResult = { ...run,
    metrics: { ...run.metrics, p95Ms: Number.NaN },
    environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
    sloAssessment: { status: "pass" as const, violations: [] },
  };
  const report = markdownReport(incomplete, { ...comparison, reasons: [] }, { ...trials, reasons: [] });
  assert.match(report, /n\/a ms/);
  assert.match(report, /One-run heuristic, not a statistical proof/);
  assert.match(report, /Bootstrap interval, not a production guarantee/);
  assert(!report.includes("## Execution environment"));
});
