import { readFile, lstat } from "node:fs/promises";
import { runBoundedProcess } from "./process";

export interface GoroutineSnapshot {
  readonly observedStacks: number;
  readonly states: Readonly<Record<string, number>>;
}

/** Text stack snapshots show observed goroutine states, not confirmed leaks. */
export function analyzeGoroutineStacks(text: string): GoroutineSnapshot {
  const states: Record<string, number> = {};
  let total = 0;
  for (const line of text.split(/\r?\n/)) {
    const found = /^goroutine \d+ \[([^\],]+)(?:,[^\]]*)?\]:/.exec(line);
    if (!found || !found[1]) continue;
    const state = found[1].trim().slice(0, 80);
    states[state] = (states[state] ?? 0) + 1;
    total++;
    if (total >= 100000) break;
  }
  return { observedStacks: total, states };
}
export function goroutineComparison(before: GoroutineSnapshot, after: GoroutineSnapshot): string {
  const delta = after.observedStacks - before.observedStacks;
  return [
    "Saturivo · Go goroutine snapshot comparison",
    "Before: " + before.observedStacks + " observed goroutine stacks",
    "After: " + after.observedStacks + " observed goroutine stacks",
    "Difference: " + (delta >= 0 ? "+" : "") + delta,
    "",
    "This is a runtime snapshot, not proof of goroutine leakage.",
    "Use repeated snapshots, traces and blocking profiles for corroboration.",
  ].join("\n");
}

export async function summarizeGoPprof(
  profilePath: string, cwd: string, signal: AbortSignal
): Promise<string> {
  const response = await runBoundedProcess({
    binary: "go", args: ["tool", "pprof", "-top", "-nodecount=20", profilePath],
    cwd, signal, timeoutMs: 30_000, maxOutputBytes: 100_000,
    env: { ...process.env, GOTOOLCHAIN: "local" },
  });
  if (response.exitCode !== 0) throw new Error(
    "Go pprof analysis exited " + response.exitCode + ": " + response.stderr.slice(-1000));
  return response.stdout + (response.truncated ? "\n[Output truncated]" : "");
}
export async function readGoroutineSnapshot(file: string): Promise<GoroutineSnapshot> {
  const info = await lstat(file);
  if (!info.isFile() || info.size > 4_000_000) {
    throw new Error("Goroutine snapshot exceeds size limit or is not a regular file");
  }
  const content = await readFile(file, "utf8");
  if (Buffer.byteLength(content) > 4_000_000) throw new Error("Goroutine snapshot exceeds size limit");
  return analyzeGoroutineStacks(content);
}
