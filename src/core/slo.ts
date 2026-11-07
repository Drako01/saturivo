import type { Metrics, SloAssessment, SloDefinition } from "./types";

export function assertValidSlo(slo: SloDefinition): void {
  const checks: Array<[number | undefined, number, number, string]> = [
    [slo.maxP95Ms, 1, 120_000, "P95"], [slo.maxP99Ms, 1, 120_000, "P99"],
    [slo.maxErrorPercent, 0, 100, "error percentage"],
    [slo.minThroughputRps, 0.01, 1_000_000, "throughput"],
  ];
  if (checks.every(([value]) => value === undefined)) throw new Error("SLO must specify a threshold");
  for (const [value, min, max, name] of checks) {
    if (value === undefined) continue;
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new Error("Invalid SLO " + name + " threshold");
    }
  }
}

/** Result classification is not a confidence interval or proof of production capacity. */
export function assessSlo(metrics: Metrics, slo?: SloDefinition): SloAssessment {
  if (!slo) return { status: "not-configured", violations: [] };
  assertValidSlo(slo);
  const violations: string[] = [];
  if (slo.maxP95Ms !== undefined && metrics.p95Ms > slo.maxP95Ms) {
    violations.push("P95 " + metrics.p95Ms.toFixed(2) + " ms exceeds " + slo.maxP95Ms + " ms");
  }
  if (slo.maxP99Ms !== undefined && metrics.p99Ms > slo.maxP99Ms) {
    violations.push("P99 " + metrics.p99Ms.toFixed(2) + " ms exceeds " + slo.maxP99Ms + " ms");
  }
  if (slo.maxErrorPercent !== undefined && metrics.failedRate * 100 > slo.maxErrorPercent) {
    violations.push("Error rate " + (metrics.failedRate * 100).toFixed(2) +
      "% exceeds " + slo.maxErrorPercent + "%");
  }
  if (slo.minThroughputRps !== undefined && metrics.requestsPerSecond < slo.minThroughputRps) {
    violations.push("Throughput " + metrics.requestsPerSecond.toFixed(2) +
      " req/s is lower than " + slo.minThroughputRps + " req/s");
  }
  if (violations.length) return { status: "fail", violations };
  if (metrics.requests < 100 || metrics.droppedIterations > 0) {
    return {
      status: "inconclusive",
      violations: metrics.requests < 100 ?
        ["Fewer than 100 requests; insufficient evidence"] :
        ["Load generator dropped iterations; requested arrival rate was not met"],
    };
  }
  return { status: "pass", violations: [] };
}
