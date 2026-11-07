import type { Comparison, RunResult } from "./types";
import { fingerprintScenario } from "./fingerprint";

const round = (value: number): number => Math.round(value * 100) / 100;
const percent = (older: number, newer: number): number => older > 0 ? round(((newer - older) / older) * 100) : 0;

export function compareRuns(baseline: RunResult, candidate: RunResult): Comparison {
  const reasons: string[] = [];
  const a = baseline.scenario;
  const b = candidate.scenario;
  if (a.target !== b.target || a.method !== b.method || a.model !== b.model ||
    a.durationSeconds !== b.durationSeconds || a.virtualUsers !== b.virtualUsers ||
    a.arrivalRate !== b.arrivalRate) reasons.push("Scenario configuration differs");
  // Backward compatible: the fingerprint is derived for older stored runs.
  if ((baseline.scenarioHash ?? fingerprintScenario(a)) !==
    (candidate.scenarioHash ?? fingerprintScenario(b))) reasons.push("Scenario fingerprint differs");
  if (baseline.environment.platform !== candidate.environment.platform ||
    baseline.environment.arch !== candidate.environment.arch ||
    baseline.environment.node !== candidate.environment.node ||
    baseline.environment.cpuCount !== candidate.environment.cpuCount) reasons.push("Execution environment differs");
  if (baseline.environment.environmentHash && candidate.environment.environmentHash &&
      baseline.environment.environmentHash !== candidate.environment.environmentHash) {
    reasons.push("Load-generator environment fingerprint differs");
  }
  if (baseline.metrics.requests < 100 || candidate.metrics.requests < 100) reasons.push("Fewer than 100 requests in at least one run");
  const deltaP95Percent = percent(baseline.metrics.p95Ms, candidate.metrics.p95Ms);
  const deltaRpsPercent = percent(baseline.metrics.requestsPerSecond, candidate.metrics.requestsPerSecond);
  const deltaFailedPercentagePoints = round((candidate.metrics.failedRate - baseline.metrics.failedRate) * 100);
  const result = { comparable: reasons.length === 0, reasons, deltaP95Percent, deltaRpsPercent, deltaFailedPercentagePoints };
  if (reasons.length) return { ...result, status: "inconclusive" };
  // Heuristic only; rigorous statistical confidence and repeated trials are planned.
  if ((deltaP95Percent > 10 && candidate.metrics.p95Ms - baseline.metrics.p95Ms > 5) ||
    deltaFailedPercentagePoints > 2 || deltaRpsPercent < -10) return { ...result, status: "regression" };
  if ((deltaP95Percent < -10 && baseline.metrics.p95Ms - candidate.metrics.p95Ms > 5) &&
    deltaFailedPercentagePoints <= 0) return { ...result, status: "improvement" };
  return { ...result, status: "stable" };
}
