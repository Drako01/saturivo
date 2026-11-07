import { fingerprintScenario } from "./fingerprint";
import type { RunResult } from "./types";

export type StatisticalStatus = "regression" | "improvement" | "stable" | "inconclusive";
export interface StatisticalComparison {
  readonly method: "bootstrap-median-p95-v1";
  readonly status: StatisticalStatus;
  readonly reasons: readonly string[];
  readonly baselineRuns: number;
  readonly candidateRuns: number;
  readonly deltaPercent: number;
  readonly ciLowerPercent: number;
  readonly ciUpperPercent: number;
}
function round(value: number): number { return Number(value.toFixed(2)); }
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const center = Math.floor(n / 2);
  if (n % 2) return sorted[center] ?? 0;
  return ((sorted[center - 1] ?? 0) + (sorted[center] ?? 0)) / 2;
}
function percentile(values: readonly number[], fraction: number): number {
  if (!values.length) return 0;
  const at = Math.floor(fraction * (values.length - 1));
  return values[at] ?? 0;
}
function environmentKey(run: RunResult): string {
  const env = run.environment;
  return JSON.stringify([env.platform, env.arch, env.node, env.cpuCount,
    env.cpuModel ?? "legacy", env.k6Version ?? "legacy"]);
}
function resampleMedian(values: readonly number[], next: () => number): number {
  return median(values.map(() => values[Math.floor(next() * values.length)] ?? 0));
}
/** Deterministic bootstrap for reproducibility; each run is the sampling unit. */
export function compareTrialGroups(
  baseline: readonly RunResult[], candidate: readonly RunResult[]
): StatisticalComparison {
  const reasons: string[] = [];
  const all = [...baseline, ...candidate];
  if (baseline.length < 3 || candidate.length < 3) reasons.push("At least 3 independent runs per group required");
  if (new Set(all.map(run => run.id)).size !== all.length) {
    reasons.push("Duplicate run IDs: baseline and candidate trials must be independent");
  }
  const environmentHashes = all.map(run => run.environment.environmentHash);
  if (environmentHashes.some(Boolean)) {
    if (environmentHashes.some(value => !value)) {
      reasons.push("Environment fingerprint absent from some trials");
    } else if (new Set(environmentHashes).size > 1) {
      reasons.push("Load-generator environment fingerprint differs");
    }
  }
  const first = all[0];
  if (!first) reasons.push("No measurements");
  else {
    const fp = fingerprintScenario(first.scenario);
    const environment = environmentKey(first);
    for (const run of all) {
      if (fingerprintScenario(run.scenario) !== fp || (run.scenarioHash && run.scenarioHash !== fp)) {
        reasons.push("Incompatible workload fingerprints"); break;
      }
    }
    for (const run of all) {
      if (environmentKey(run) !== environment) {
        reasons.push("Execution environment differs"); break;
      }
    }
    if (all.some(run => run.metrics.requests < 100 || run.metrics.droppedIterations > 0)) {
      reasons.push("Insufficient requests or dropped load-generator iterations");
    }
    if (all.some(run => !Number.isFinite(run.metrics.p95Ms) || run.metrics.p95Ms <= 0)) {
      reasons.push("Missing positive P95 measurement");
    }
  }
  const fallback: StatisticalComparison = {
    method: "bootstrap-median-p95-v1", status: "inconclusive",
    reasons, baselineRuns: baseline.length, candidateRuns: candidate.length,
    deltaPercent: 0, ciLowerPercent: 0, ciUpperPercent: 0,
  };
  if (reasons.length) return fallback;

  const before = baseline.map(run => run.metrics.p95Ms);
  const after = candidate.map(run => run.metrics.p95Ms);
  const medianBefore = median(before), medianAfter = median(after);
  if (medianBefore <= 0) return { ...fallback, reasons: ["Baseline median P95 is zero"] };
  const delta = (medianAfter / medianBefore - 1) * 100;
  let seed = 0x51a7e2d1;
  const random = (): number => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const samples: number[] = [];
  for (let i = 0; i < 1200; i++) {
    const oldMedian = resampleMedian(before, random);
    const newMedian = resampleMedian(after, random);
    samples.push(oldMedian > 0 ? (newMedian / oldMedian - 1) * 100 : 0);
  }
  samples.sort((a, b) => a - b);
  const lo = percentile(samples, 0.025), hi = percentile(samples, 0.975);
  let status: StatisticalStatus = "inconclusive";
  if (lo > 10 && medianAfter - medianBefore > 5) status = "regression";
  else if (hi < -10 && medianBefore - medianAfter > 5) status = "improvement";
  else if (lo >= -5 && hi <= 5) status = "stable";
  return {
    ...fallback, status, reasons: status === "inconclusive" ?
      ["Confidence interval overlaps practical significance thresholds"] : [],
    deltaPercent: round(delta), ciLowerPercent: round(lo), ciUpperPercent: round(hi),
  };
}
