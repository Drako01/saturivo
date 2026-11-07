import type { RunResult } from "./types";

/**
 * Evidence quality reasons shared by single-run and repeated-trial comparisons.
 * A budget-capped run cannot establish sustainable throughput or a performance
 * regression even when the observed latency delta appears decisive.
 */
export function measurementQualityReasons(run: RunResult): readonly string[] {
  const reasons: string[] = [];
  const total = run.metrics.totalRequests ?? run.metrics.requests;
  const approvedBudget = run.scenario.maxRequests ?? 10000;
  if (total >= approvedBudget) {
    reasons.push("Request budget reached; observed throughput may be capped");
  }
  if (run.metrics.droppedIterations > 0) {
    reasons.push("Dropped load-generator iterations");
  }
  if (run.sloAssessment?.status === "inconclusive") {
    reasons.push("Run SLO assessment is inconclusive");
  }
  return reasons;
}
