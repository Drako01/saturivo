import type { Comparison, RunResult } from "./types";
import { fingerprintScenario } from "./fingerprint";

function safe(value: string): string {
  return value.replace(/[|\\r\\n]/g, " ").replace(/[<>]/g, "");
}
function num(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : "n/a";
}

export function markdownReport(run: RunResult, comparison?: Comparison): string {
  const lines = [
    "# Saturivo · Performance run",
    "",
    "- ID: " + safe(run.id),
    "- Start: " + safe(run.startedAt),
    "- Engine: k6",
    "- Scenario: " + safe(run.scenario.name),
    "- Scenario SHA-256: `" + fingerprintScenario(run.scenario) + "`",
    "- Target: " + safe(run.scenario.target),
    "- Model: " + run.scenario.model,
    "- VUs: " + run.scenario.virtualUsers,
    "- Duration: " + run.scenario.durationSeconds + " seconds",
    "",
    "| Metric | Value |",
    "|---|---:|",
    "| Requests | " + run.metrics.requests + " |",
    "| Throughput | " + num(run.metrics.requestsPerSecond) + " req/s |",
    "| Failed | " + num(run.metrics.failedRate * 100) + "% |",
    "| Average | " + num(run.metrics.avgMs) + " ms |",
    "| P50 | " + num(run.metrics.p50Ms) + " ms |",
    "| P95 | " + num(run.metrics.p95Ms) + " ms |",
    "| P99 | " + num(run.metrics.p99Ms) + " ms |",
    "| Dropped iterations | " + run.metrics.droppedIterations + " |",
  ];
  if (comparison) lines.push("", "## Relative comparison", "", "- Classification: " + comparison.status,
    "- P95 delta: " + num(comparison.deltaP95Percent) + "%",
    "- RPS delta: " + num(comparison.deltaRpsPercent) + "%",
    "- Error rate delta: " + num(comparison.deltaFailedPercentagePoints) + " percentage points",
    "- Caveats: " + (comparison.reasons.join("; ") || "One-run heuristic, not a statistical proof"));
  if (run.warnings.length) lines.push("", "## Warnings", "", ...run.warnings.map(w => "- " + safe(w)));
  lines.push("", "> Measurements are local observations, not a guarantee of production capacity.", "");
  return lines.join("\n");
}
