import { test } from "node:test";
import { strict as assert } from "node:assert";
import { discoverLocalCapacity, type CapacitySearchPlan } from "../src/core/capacity";
import { assessSlo } from "../src/core/slo";
import type { RunResult, Scenario } from "../src/core/types";
const plan: CapacitySearchPlan = {
  target: "http://127.0.0.1:6061/health", durationSeconds: 10,
  virtualUsers: 10, startRate: 5, maxRate: 40, maxSteps: 4,
  maxRequestsPerStep: 500, totalRequestBudget: 2000,
  slo: { maxP95Ms: 100, maxErrorPercent: 1 },
};
const policy = { allowRemoteTargets: false, maxVirtualUsers: 20, maxRequests: 10000 };
function fixture(scenario: Scenario): RunResult {
  const rate = scenario.arrivalRate ?? 0;
  const p95Ms = rate >= 40 ? 150 : 25;
  return {
    schemaVersion: 1, id: "fixture-" + rate,
    engine: "k6", startedAt: "2026-11-07T10:00:00Z",
    endedAt: "2026-11-07T10:00:10Z", scenario,
    metrics: { requests: rate * 10, requestsPerSecond: rate,
      failedRate: 0, avgMs: 20, p50Ms: 10, p95Ms, p99Ms: p95Ms + 20,
      droppedIterations: 0 },
    sloAssessment: assessSlo({ requests: rate * 10, requestsPerSecond: rate,
      failedRate: 0, avgMs: 20, p50Ms: 10, p95Ms, p99Ms: p95Ms + 20,
      droppedIterations: 0 }, scenario.slo),
    environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
    warnings: [],
  };
}
test("bounded discovery stops on first measured SLO breach", async () => {
  const rates: number[] = [];
  const result = await discoverLocalCapacity(plan, policy, async scenario => fixture(scenario),
    new AbortController().signal, rate => rates.push(rate));
  assert.deepEqual(rates, [5]);
  // 5/s yields just 50 requests, so evidence is inconclusive, not a false PASS.
  assert.equal(result.stopReason, "inconclusive");
  assert.equal(result.highestPassingArrivalRate, null);
});
test("with enough samples, discovery finds highest observed passing rate", async () => {
  const result = await discoverLocalCapacity({ ...plan, startRate: 10 },
    policy, async scenario => fixture(scenario), new AbortController().signal);
  assert.equal(result.highestPassingArrivalRate, 20);
  assert.equal(result.stopReason, "slo-violation");
  assert.deepEqual(result.trials.map(x => x.attemptedRate), [10, 20, 40]);
  assert(result.totalRequests <= 2000);
});
test("all passing tests report configured ceiling, not production capacity", async () => {
  const result = await discoverLocalCapacity({ ...plan, startRate: 10, maxRate: 20 },
    policy, async scenario => ({ ...fixture(scenario),
      metrics: { ...fixture(scenario).metrics, p95Ms: 10 } }),
    new AbortController().signal);
  assert.equal(result.stopReason, "configured-ceiling");
  assert.equal(result.highestPassingArrivalRate, 20);
});
test("rejects unauthorized remote targets and missing SLO", async () => {
  const execute = async (scenario: Scenario): Promise<RunResult> => fixture(scenario);
  for (const target of ["http://localhost:6061/", "https://127.0.0.1:6061/",
    "http://10.0.0.1:6061/", "http://example.com/"]) {
    await assert.rejects(discoverLocalCapacity({ ...plan, target }, policy,
      execute, new AbortController().signal), /literal HTTP loopback/);
  }
  await assert.rejects(discoverLocalCapacity({ ...plan, slo: {} }, policy,
    execute, new AbortController().signal), /requires a P95/);
});
test("stops when budget is consumed and propagates abort", async () => {
  const result = await discoverLocalCapacity({ ...plan, startRate: 10, totalRequestBudget: 250 },
    policy, async scenario => {
      const measurement = fixture(scenario);
      return { ...measurement, metrics: { ...measurement.metrics,
        requests: scenario.arrivalRate === 20 ? 140 : 100 } };
    }, new AbortController().signal);
  assert.equal(result.totalRequests, 240);
  assert.equal(result.stopReason, "request-budget");
  await assert.rejects(discoverLocalCapacity({ ...plan, startRate: 10, totalRequestBudget: 200 },
    policy, async scenario => fixture(scenario), new AbortController().signal),
    /exceeded its request budget/);
  const abort = new AbortController(); abort.abort();
  await assert.rejects(discoverLocalCapacity(plan, policy, async scenario => fixture(scenario),
    abort.signal), /Cancelled/);
});
