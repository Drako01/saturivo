import type { Comparison, RunResult } from "./types";
import { fingerprintScenario } from "./fingerprint";
import type { StatisticalComparison } from "./statistics";
import { escapeMarkdownInline } from "./markdown-safety";

function safe(value: string): string { return escapeMarkdownInline(value); }
/** Preserve the experiment fingerprint, but never print URL query secrets in Markdown. */
function reportTarget(raw: string): string {
  const queryStart = raw.indexOf("?");
  return safe(queryStart >= 0 ? raw.slice(0, queryStart) + "?[query redacted]" : raw);
}
function num(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

export function markdownReport(run: RunResult, comparison?: Comparison,
  trials?: StatisticalComparison): string {
  const lines = [
    "# Saturivo · Performance run",
    "",
    "- ID: " + safe(run.id),
    "- Start: " + safe(run.startedAt),
    "- Engine: k6",
    "- Scenario: " + safe(run.scenario.name),
    "- Scenario SHA-256: `" + fingerprintScenario(run.scenario) + "`",
    "- SLO: " + (run.sloAssessment?.status ?? "not-configured"),
    "- k6 version: " + safe(run.environment.k6Version ?? "unknown"),
    "- Target: " + reportTarget(run.scenario.target),
    ...(run.scenario.target.includes("?") ? [
      "- Privacy: URL query redacted in this Markdown report; the scenario SHA identifies the original workload.",
    ] : []),
    "- Model: " + run.scenario.model,
    "- VUs: " + run.scenario.virtualUsers,
    "- Duration: " + run.scenario.durationSeconds + " seconds",
    ...((run.scenario.warmupSeconds ?? 0) + (run.scenario.cooldownSeconds ?? 0) > 0 ? [
      "- Warm-up: " + (run.scenario.warmupSeconds ?? 0) + " seconds (excluded)",
      "- Measured window: " + (run.scenario.durationSeconds -
        (run.scenario.warmupSeconds ?? 0) - (run.scenario.cooldownSeconds ?? 0)) + " seconds",
      "- Cool-down: " + (run.scenario.cooldownSeconds ?? 0) + " seconds (excluded)",
      "- Scope: latency/error/throughput metrics reflect only measurement-window requests.",
    ] : []),
    "",
    "| Metric | Value |",
    "|---|---:|",
    "| " + (run.metrics.totalRequests !== undefined ? "Measured HTTP requests" : "Requests") +
      " | " + run.metrics.requests + " |",
    ...(run.metrics.totalRequests !== undefined ?
      ["| Total HTTP requests (all phases) | " + run.metrics.totalRequests + " |"] : []),
    "| Throughput | " + num(run.metrics.requestsPerSecond) + " req/s |",
    "| Failed | " + num(run.metrics.failedRate * 100) + "% |",
    "| Average | " + num(run.metrics.avgMs) + " ms |",
    "| P50 | " + num(run.metrics.p50Ms) + " ms |",
    "| P95 | " + num(run.metrics.p95Ms) + " ms |",
    "| P99 | " + num(run.metrics.p99Ms) + " ms |",
    "| Dropped iterations | " + run.metrics.droppedIterations + " |",
  ];
  if (run.metrics.targetArrivalRate !== undefined) {
    lines.push("| Requested arrivals | " + num(run.metrics.targetArrivalRate) + " /s |");
  }
  if (run.metrics.achievedArrivalRate !== undefined) {
    lines.push("| Observed HTTP arrivals | " + num(run.metrics.achievedArrivalRate) + " /s |");
  }
  if (run.metrics.statusDistribution) {
    for (const [status, count] of Object.entries(run.metrics.statusDistribution)) {
      lines.push("| HTTP " + safe(status) + " | " + count + " |");
    }
  }
  if (run.environment.environmentHash) {
    lines.push("", "## Execution environment", "",
      "- Environment SHA-256: `" + run.environment.environmentHash + "`",
      "- Host fingerprint SHA-256: `" + (run.environment.loadHostFingerprint ?? "unavailable") + "`",
      "- CPU model: " + safe(run.environment.cpuModel ?? "unknown"),
      "- CPU count: " + run.environment.cpuCount,
      "- Source revision: " + safe(run.environment.gitSha ?? "not captured"),
      "",
      "Host identity is pseudonymous, not anonymous. Review before exporting.");
  }
  if (run.sloAssessment?.violations.length) lines.push("", "## SLO findings", "",
    ...run.sloAssessment.violations.map(value => "- " + safe(value)));
  if (comparison) lines.push("", "## Relative comparison", "", "- Classification: " + comparison.status,
    "- P95 delta: " + num(comparison.deltaP95Percent) + "%",
    "- RPS delta: " + num(comparison.deltaRpsPercent) + "%",
    "- Error rate delta: " + num(comparison.deltaFailedPercentagePoints) + " percentage points",
    "- Caveats: " + (comparison.reasons.map(safe).join("; ") || "One-run heuristic, not a statistical proof"));
  if (trials) lines.push("", "## Repeated trials (independent runs)", "",
    "- Method: " + trials.method,
    "- Result: " + trials.status,
    "- Baseline runs: " + trials.baselineRuns,
    "- Candidate runs: " + trials.candidateRuns,
    "- Median P95 delta: " + num(trials.deltaPercent) + "%",
    "- Empirical 95% interval: [" + num(trials.ciLowerPercent) + "%, " +
      num(trials.ciUpperPercent) + "%]",
    "- Caveats: " + (trials.reasons.map(safe).join("; ") || "Bootstrap interval, not a production guarantee"));
  if (run.warnings.length) lines.push("", "## Warnings", "", ...run.warnings.map(w => "- " + safe(w)));
  lines.push("", "> Measurements are local observations, not a guarantee of production capacity.", "");
  return lines.join("\n");
}
