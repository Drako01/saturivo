import { createHash, randomUUID } from "node:crypto";
import { cpus, totalmem, hostname } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import type { RunResult, Scenario } from "./types";
import { readK6Summary } from "./metrics";
import { runBoundedProcess } from "./process";
import { fingerprintScenario } from "./fingerprint";
import { assessSlo } from "./slo";
import { validateScenario, type TargetPolicy } from "./validation";
import { pinnedTargetHosts } from "./network-safety";

export function renderK6Script(
  scenario: Scenario, output: string, verifiedHosts: Readonly<Record<string, string>> = {}
): string {
  const warmup = scenario.warmupSeconds ?? 0;
  const cooldown = scenario.cooldownSeconds ?? 0;
  const phased = warmup > 0 || cooldown > 0;
  const executor = scenario.model === "constant-vus"
    ? { executor: "constant-vus", vus: scenario.virtualUsers, duration: scenario.durationSeconds + "s" }
    : scenario.model === "constant-arrival-rate"
      ? { executor: "constant-arrival-rate", rate: scenario.arrivalRate, timeUnit: "1s",
        duration: scenario.durationSeconds + "s", preAllocatedVUs: Math.min(5, scenario.virtualUsers),
        maxVUs: scenario.virtualUsers }
      : { executor: "ramping-vus", startVUs: 0,
        stages: (scenario.stages ?? []).map(stage => ({
          duration: stage.durationSeconds + "s", target: stage.targetVus,
        })),
        gracefulRampDown: "0s" };
  const options = {
    scenarios: { saturivo: executor },
    // Scoped submetrics only when a validated v2 measurement window is configured.
    ...(phased ? { thresholds: {
      "http_reqs{saturivo_phase:measurement}": ["count>0"],
      "http_req_failed{saturivo_phase:measurement}": ["rate<1.1"],
      "http_req_duration{saturivo_phase:measurement}": ["p(95)<120000"],
    } } : {}),
    summaryTrendStats: ["avg", "min", "med", "max", "p(90)", "p(95)", "p(99)"],
    discardResponseBodies: true,
    noConnectionReuse: false,
    userAgent: "Saturivo/0.2.0",
    // Explicit local host pinning prevents malicious host-file / DNS changes.
    hosts: ["localhost", "localhost."].includes(new URL(scenario.target).hostname.toLowerCase())
      ? { localhost: "127.0.0.1", "localhost.": "127.0.0.1" } : verifiedHosts,
  };
  return [
    'import http from "k6/http";',
    'import exec from "k6/execution";',
    'import { sleep } from "k6";',
    'import { Counter } from "k6/metrics";',
    'const statuses = {',
    '  1: new Counter("saturivo_status_1xx"),',
    '  2: new Counter("saturivo_status_2xx"),',
    '  3: new Counter("saturivo_status_3xx"),',
    '  4: new Counter("saturivo_status_4xx"),',
    '  5: new Counter("saturivo_status_5xx"),',
    '  other: new Counter("saturivo_status_unknown"),',
    '};',
    ...(phased ? [
      'const measuredStatuses = {',
      '  1: new Counter("saturivo_measure_status_1xx"),',
      '  2: new Counter("saturivo_measure_status_2xx"),',
      '  3: new Counter("saturivo_measure_status_3xx"),',
      '  4: new Counter("saturivo_measure_status_4xx"),',
      '  5: new Counter("saturivo_measure_status_5xx"),',
      '  other: new Counter("saturivo_measure_status_unknown"),',
      '};',
    ] : []),
    "export const options = " + JSON.stringify(options) + ";",
    "export default function () {",
    "  if (exec.scenario.iterationInTest >= " + String(scenario.maxRequests ?? 10000) + ") { sleep(1); return; }",
    ...(phased ? [
      "  const elapsed = exec.instance.currentTestRunDuration / 1000;",
      "  const phase = elapsed < " + warmup + " ? \"warmup\" : elapsed >= " +
        (scenario.durationSeconds - cooldown) + " ? \"cooldown\" : \"measurement\";",
    ] : []),
    "  const response = http.request(" + JSON.stringify(scenario.method) + ", " + JSON.stringify(scenario.target) +
      (phased ? ', null, { redirects: 0, timeout: "10s", tags: { saturivo_phase: phase } });' :
        ', null, { redirects: 0, timeout: "10s" });'),
    '  const group = Math.floor(Number(response.status || 0) / 100);',
    '  if (group >= 1 && group <= 5) statuses[group].add(1); else statuses.other.add(1);',
    ...(phased ? [
      '  if (phase === "measurement") {',
      '    if (group >= 1 && group <= 5) measuredStatuses[group].add(1);',
      '    else measuredStatuses.other.add(1);',
      '  }',
    ] : []),
    "}",
    "export function handleSummary(data) {",
    "  return { [" + JSON.stringify(output) + "]: JSON.stringify(data) };",
    "}",
    "",
  ].join("\n");
}

async function optionalGitSha(sourceRoot: string | undefined, signal: AbortSignal): Promise<string | undefined> {
  if (!sourceRoot) return undefined;
  try {
    const result = await runBoundedProcess({
      binary: "git", args: ["rev-parse", "--verify", "HEAD"], cwd: sourceRoot,
      timeoutMs: 5000, maxOutputBytes: 1024, signal,
      env: { PATH: process.env.PATH, Path: process.env.Path,
        SystemRoot: process.env.SystemRoot },
    });
    const sha = result.stdout.trim();
    return result.exitCode === 0 && /^[a-f0-9]{40,64}$/.test(sha) ? sha : undefined;
  } catch (error) {
    if (signal.aborted) throw error;
    return undefined; // Projects without Git remain fully supported.
  }
}

export async function runK6(
  scenario: Scenario,
  policy: TargetPolicy,
  binary: string,
  workspaceStorage: string,
  signal: AbortSignal,
  sourceRoot?: string
): Promise<RunResult> {
  const safeScenario = validateScenario(scenario, policy);
  if (signal.aborted) throw new Error("Cancelled");
  const verifiedHosts = await pinnedTargetHosts(safeScenario.target, signal);
  const gitSha = await optionalGitSha(sourceRoot, signal);
  await mkdir(workspaceStorage, { recursive: true });
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
    await writeFile(script, renderK6Script(safeScenario, summary, verifiedHosts), { encoding: "utf8", mode: 0o600 });
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
    const warmup = safeScenario.warmupSeconds ?? 0;
    const cooldown = safeScenario.cooldownSeconds ?? 0;
    const measuredSeconds = warmup || cooldown ? safeScenario.durationSeconds - warmup - cooldown : undefined;
    const metrics = readK6Summary(JSON.parse(summaryText) as unknown,
      safeScenario.model === "constant-arrival-rate" ? safeScenario.arrivalRate : undefined,
      measuredSeconds);
    const warnings: string[] = [];
    if (measuredSeconds !== undefined) warnings.push(
      "The measured HTTP window excludes warm-up and cool-down requests; dropped iterations and the global budget still cover the full test.");
    else if (safeScenario.model === "ramping-vus") warnings.push(
      "Ramp metrics cover all stages; warm-up and cool-down are not excluded from reported percentiles.");
    if (processResult.truncated) warnings.push("k6 process output exceeded the capture budget; see summary metrics for evidence.");
    if (metrics.droppedIterations > 0) warnings.push("Dropped iterations: the configured arrival rate was not fully achieved.");
    if (metrics.targetArrivalRate !== undefined && metrics.achievedArrivalRate !== undefined &&
        metrics.achievedArrivalRate < metrics.targetArrivalRate * 0.95) {
      warnings.push("Achieved request arrivals are over 5% below requested arrival rate.");
    }
    if (metrics.requests < 100) warnings.push("Small sample size: avoid drawing strong conclusions.");
    const budgetReached = (metrics.totalRequests ?? metrics.requests) >= (safeScenario.maxRequests ?? 10000);
    if (budgetReached) warnings.push("Request budget reached: observed throughput is capped, not sustainable capacity.");
    const cpu = cpus();
    const cpuModel = cpu[0]?.model ?? "unknown";
    const loadHostFingerprint = createHash("sha256").update("saturivo-host-v1:" + hostname()).digest("hex");
    const environmentHash = createHash("sha256").update(JSON.stringify([
      process.platform, process.arch, process.version, cpu.length, cpuModel,
      totalmem(), k6Version, loadHostFingerprint,
    ])).digest("hex");
    return {
      schemaVersion: 2, id, startedAt, endedAt: new Date().toISOString(),
      engine: "k6", scenario: safeScenario, scenarioHash: fingerprintScenario(safeScenario), metrics,
      sloAssessment: assessSlo(metrics, safeScenario.slo, budgetReached),
      environment: { platform: process.platform, arch: process.arch,
        node: process.version, cpuCount: cpu.length,
        cpuModel, totalMemoryBytes: totalmem(), k6Version,
        loadHostFingerprint, environmentHash, ...(gitSha ? { gitSha } : {}) },
      warnings,
    };
  } finally {
    await rm(runDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
