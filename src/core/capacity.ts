import { isIP } from "node:net";
import { assessSlo } from "./slo";
import { fingerprintScenario } from "./fingerprint";
import { validateScenario, type TargetPolicy } from "./validation";
import type { RunResult, Scenario, SloDefinition } from "./types";

export interface CapacitySearchPlan {
  readonly target: string;
  readonly durationSeconds: number;
  readonly virtualUsers: number;
  readonly startRate: number;
  readonly maxRate: number;
  readonly maxSteps: number;
  readonly maxRequestsPerStep: number;
  readonly totalRequestBudget: number;
  readonly slo: SloDefinition;
}
export type CapacityStopReason = "slo-violation" | "inconclusive" |
  "configured-ceiling" | "request-budget";
export interface CapacityTrial {
  readonly attemptedRate: number;
  readonly actualRate: number;
  readonly p95Ms: number;
  readonly failedRate: number;
  readonly droppedIterations: number;
  readonly requests: number;
  readonly result: "pass" | "fail" | "inconclusive";
  readonly scenarioHash: string;
  readonly runId: string;
}
export interface CapacitySearchResult {
  readonly status: "bounded-local-observation";
  readonly highestPassingArrivalRate: number | null;
  readonly stopReason: CapacityStopReason;
  readonly totalRequests: number;
  readonly trials: readonly CapacityTrial[];
  readonly warnings: readonly string[];
}
export type CapacityExperiment = (scenario: Scenario, signal: AbortSignal) => Promise<RunResult>;

function assertLiteralLoopback(raw: string): void {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid capacity discovery target"); }
  const h = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (url.protocol !== "http:" || url.username || url.password ||
    !(isIP(h) === 4 && h.startsWith("127.") || h === "::1")) {
    throw new Error("Capacity discovery requires a literal HTTP loopback IP; no remote targets");
  }
}

/** Local, explicitly user-approved, increasing open-loop load — never a production rating. */
export async function discoverLocalCapacity(
  plan: CapacitySearchPlan,
  policy: TargetPolicy,
  execute: CapacityExperiment,
  signal: AbortSignal,
  onStart?: (rate: number, step: number) => void
): Promise<CapacitySearchResult> {
  assertLiteralLoopback(plan.target);
  if (plan.slo.maxP95Ms === undefined) throw new Error("Capacity discovery requires a P95 SLO");
  if (!Number.isInteger(plan.startRate) || plan.startRate < 1 ||
    !Number.isInteger(plan.maxRate) || plan.maxRate < plan.startRate ||
    plan.maxRate > 100 || !Number.isInteger(plan.maxSteps) ||
    plan.maxSteps < 1 || plan.maxSteps > 5) {
    throw new Error("Capacity discovery rate/step limits are invalid");
  }
  if (!Number.isInteger(plan.totalRequestBudget) || plan.totalRequestBudget < 100 ||
    plan.totalRequestBudget > 30_000 || !Number.isInteger(plan.maxRequestsPerStep) ||
    plan.maxRequestsPerStep < 100 || plan.maxRequestsPerStep > 10_000) {
    throw new Error("Capacity discovery request budgets are invalid");
  }
  const policyLimit = policy.maxRequests ?? 10_000;
  if (plan.maxRequestsPerStep > policyLimit) throw new Error("Capacity test exceeds workspace request ceiling");
  if (signal.aborted) throw new Error("Cancelled");
  const trials: CapacityTrial[] = [];
  let requests = 0;
  let lastPass: number | null = null;
  let stopReason: CapacityStopReason = "configured-ceiling";
  let rate = plan.startRate;
  for (let step = 1; step <= plan.maxSteps; step++) {
    if (signal.aborted) throw new Error("Cancelled");
    const remaining = plan.totalRequestBudget - requests;
    if (remaining < 100) { stopReason = "request-budget"; break; }
    const maxRequests = Math.min(plan.maxRequestsPerStep, remaining);
    const scenario: Scenario = validateScenario({
      id: "capacity-local", name: "Local capacity pilot · " + rate + "/s",
      target: plan.target, method: "GET",
      model: "constant-arrival-rate", durationSeconds: plan.durationSeconds,
      virtualUsers: plan.virtualUsers, arrivalRate: rate,
      maxRequests, slo: plan.slo,
    }, policy);
    onStart?.(rate, step);
    const evidence = await execute(scenario, signal);
    if (signal.aborted) throw new Error("Cancelled");
    if (evidence.metrics.requests > maxRequests) throw new Error("Capacity measurement exceeded its request budget");
    if (fingerprintScenario(evidence.scenario) !== fingerprintScenario(scenario)) {
      throw new Error("Capacity measurement does not match the attempted scenario");
    }
    requests += evidence.metrics.requests;
    const evaluation = assessSlo(evidence.metrics, plan.slo,
      evidence.metrics.requests >= maxRequests);
    const result = evaluation.status === "pass" ? "pass" :
      evaluation.status === "fail" ? "fail" : "inconclusive";
    trials.push({
      attemptedRate: rate, actualRate: evidence.metrics.requestsPerSecond,
      p95Ms: evidence.metrics.p95Ms, failedRate: evidence.metrics.failedRate,
      droppedIterations: evidence.metrics.droppedIterations,
      requests: evidence.metrics.requests, result,
      scenarioHash: fingerprintScenario(scenario), runId: evidence.id,
    });
    if (result === "fail") { stopReason = "slo-violation"; break; }
    if (result === "inconclusive") { stopReason = "inconclusive"; break; }
    lastPass = rate;
    if (step === plan.maxSteps || rate >= plan.maxRate) {
      stopReason = "configured-ceiling"; break;
    }
    rate = Math.min(plan.maxRate, rate * 2);
  }
  return {
    status: "bounded-local-observation",
    highestPassingArrivalRate: lastPass,
    stopReason, totalRequests: requests, trials,
    warnings: [
      "Capacity is an observation of this local workload and machine, not a production guarantee.",
      "Use repeated trials and independent load generation to validate a suspected limit.",
    ],
  };
}
