import { randomUUID } from "node:crypto";
import { cpus, totalmem } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import type { RunResult, Scenario } from "./types";
import { readK6Summary } from "./metrics";
import { runBoundedProcess } from "./process";
import { fingerprintScenario } from "./fingerprint";
import { assessSlo } from "./slo";
import { validateScenario, type TargetPolicy } from "./validation";

export function renderK6Script(scenario: Scenario, output: string): string {
  const executor = scenario.model === "constant-vus"
    ? { executor: "constant-vus", vus: scenario.virtualUsers, duration: scenario.durationSeconds + "s" }
    : { executor: "constant-arrival-rate", rate: scenario.arrivalRate, timeUnit: "1s",
      duration: scenario.durationSeconds + "s", preAllocatedVUs: Math.min(5, scenario.virtualUsers),
      maxVUs: scenario.virtualUsers };
  const options = {
    scenarios: { saturivo: executor },
    summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
    discardResponseBodies: true,
    noConnectionReuse: false,
    userAgent: "Saturivo/0.1.0",
  };
  return [
    'import http from "k6/http";',
    'import exec from "k6/execution";',
    'import { sleep } from "k6";',
    "export const options = " + JSON.stringify(options) + ";",
    "export default function () {",
    "  if (exec.scenario.iterationInTest >= " + String(scenario.maxRequests ?? 10000) + ") { sleep(1); return; }",
    "  http.request(" + JSON.stringify(scenario.method) + ", " + JSON.stringify(scenario.target) +
      ', null, { redirects: 0, timeout: "10s" });',
    "}",
    "export function handleSummary(data) {",
    "  return { [" + JSON.stringify(output) + "]: JSON.stringify(data) };",
    "}",
    "",
  ].join("\n");
}

export async function runK6(
  scenario: Scenario,
  policy: TargetPolicy,
  binary: string,
  workspaceStorage: string,
  signal: AbortSignal
): Promise<RunResult> {
  const safeScenario = validateScenario(scenario, policy);
  if (signal.aborted) throw new Error("Cancelled");
  const version = await runBoundedProcess({
    binary, args: ["version"], cwd: workspaceStorage,
    timeoutMs: 5000, maxOutputBytes: 2048, signal,
    env: { ...process.env, K6_NO_USAGE_REPORT: "true" },
  });
  if (version.exitCode !== 0) throw new Error("Could not determine k6 version");
  const k6Version = (version.stdout + version.stderr).trim().slice(0, 160);
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  const runDirectory = join(workspaceStorage, "temporary", id);
  const script = join(runDirectory, "scenario.js");
  const summary = join(runDirectory, "summary.json");
  await mkdir(runDirectory, { recursive: true });
  try {
    await writeFile(script, renderK6Script(safeScenario, summary), { encoding: "utf8", mode: 0o600 });
    const processResult = await runBoundedProcess({
      binary,
      args: ["run", "--quiet", script],
      cwd: runDirectory,
      timeoutMs: (safeScenario.durationSeconds + 45) * 1000,
      maxOutputBytes: 16_384,
      signal,
      env: {
        PATH: process.env.PATH, Path: process.env.Path, HOME: process.env.HOME,
        USERPROFILE: process.env.USERPROFILE, TEMP: process.env.TEMP,
        TMP: process.env.TMP, TMPDIR: process.env.TMPDIR,
        SystemRoot: process.env.SystemRoot, K6_NO_USAGE_REPORT: "true",
      },
    });
    if (processResult.exitCode !== 0) {
      throw new Error("k6 exited with status " + processResult.exitCode + ": " +
        processResult.stderr.slice(-3000));
    }
    if ((await stat(summary)).size > 4_000_000) throw new Error("Summary exceeds the size limit");
    const summaryText = await readFile(summary, "utf8");
    if (Buffer.byteLength(summaryText) > 4_000_000) throw new Error("Summary exceeds the size limit");
    const metrics = readK6Summary(JSON.parse(summaryText) as unknown);
    const warnings: string[] = [];
    if (metrics.droppedIterations > 0) warnings.push("Dropped iterations: the configured arrival rate was not fully achieved.");
    if (metrics.requests < 100) warnings.push("Small sample size: avoid drawing strong conclusions.");
    const budgetReached = metrics.requests >= (safeScenario.maxRequests ?? 10000);
    if (budgetReached) warnings.push("Request budget reached: observed throughput is capped, not sustainable capacity.");
    return {
      schemaVersion: 1, id, startedAt, endedAt: new Date().toISOString(),
      engine: "k6", scenario: safeScenario, scenarioHash: fingerprintScenario(safeScenario), metrics,
      sloAssessment: assessSlo(metrics, safeScenario.slo, budgetReached),
      environment: { platform: process.platform, arch: process.arch,
        node: process.version, cpuCount: cpus().length,
        cpuModel: cpus()[0]?.model ?? "unknown", totalMemoryBytes: totalmem(), k6Version },
      warnings,
    };
  } finally {
    await rm(runDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
