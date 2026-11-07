import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpus } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import type { RunResult, Scenario } from "./types";
import { readK6Summary } from "./metrics";
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
    "export const options = " + JSON.stringify(options) + ";",
    "export default function () {",
    "  http.request(" + JSON.stringify(scenario.method) + ", " + JSON.stringify(scenario.target) +
      ', null, { redirects: 0, timeout: "10s" });',
    "}",
    "export function handleSummary(data) {",
    "  return { [" + JSON.stringify(output) + "]: JSON.stringify(data) };",
    "}",
    "",
  ].join("\n");
}

function trimmed(value: string): string {
  return value.length > 5000 ? value.slice(-5000) : value;
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
  const id = randomUUID();
  const startedAt = new Date().toISOString();
  const runDirectory = join(workspaceStorage, "temporary", id);
  const script = join(runDirectory, "scenario.js");
  const summary = join(runDirectory, "summary.json");
  await mkdir(runDirectory, { recursive: true });
  try {
    await writeFile(script, renderK6Script(safeScenario, summary), { encoding: "utf8", mode: 0o600 });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(binary, ["run", "--quiet", script], {
        cwd: runDirectory, shell: false, windowsHide: true, signal,
        env: {
          PATH: process.env.PATH, Path: process.env.Path, HOME: process.env.HOME,
          USERPROFILE: process.env.USERPROFILE, TEMP: process.env.TEMP,
          TMP: process.env.TMP, TMPDIR: process.env.TMPDIR,
          SystemRoot: process.env.SystemRoot, K6_NO_USAGE_REPORT: "true",
        },
      });
      let stderr = "";
      const killTimer = setTimeout(() => child.kill(), (safeScenario.durationSeconds + 45) * 1000);
      child.stdout.on("data", () => { /* Summary is read from a bounded local artifact. */ });
      child.stderr.on("data", (chunk: Buffer) => { stderr = trimmed(stderr + chunk.toString("utf8")); });
      child.once("error", (error) => { clearTimeout(killTimer); reject(error); });
      child.once("close", (code) => {
        clearTimeout(killTimer);
        if (signal.aborted) reject(new Error("Cancelled"));
        else if (code !== 0) reject(new Error("k6 exited with status " + String(code) + ": " + stderr));
        else resolve();
      });
    });
    const stat = await readFile(summary, "utf8");
    if (Buffer.byteLength(stat) > 4_000_000) throw new Error("Summary exceeds the size limit");
    const metrics = readK6Summary(JSON.parse(stat) as unknown);
    const warnings: string[] = [];
    if (metrics.droppedIterations > 0) warnings.push("Dropped iterations: the configured arrival rate was not fully achieved.");
    if (metrics.requests < 100) warnings.push("Small sample size: avoid drawing strong conclusions.");
    return {
      schemaVersion: 1, id, startedAt, endedAt: new Date().toISOString(),
      engine: "k6", scenario: safeScenario, metrics,
      environment: { platform: process.platform, arch: process.arch,
        node: process.version, cpuCount: cpus().length },
      warnings,
    };
  } finally {
    await rm(runDirectory, { recursive: true, force: true }).catch(() => undefined);
  }
}
