import { performance } from "node:perf_hooks";
import type { GoGcObservation } from "./go-gc";
import type { CapturedGoProfile } from "./go-profiler";
import { readGoroutineSnapshot, type GoroutineSnapshot } from "./go-profile-analysis";
import type { RunResult } from "./types";
import { escapeMarkdownInline } from "./markdown-safety";

export type TimelinePhase = "before" | "during" | "after";
export interface ProfilePoint {
  readonly phase: TimelinePhase;
  readonly observedAt: string;
  readonly snapshot: GoroutineSnapshot;
  readonly profile: CapturedGoProfile;
  /** Monotonic elapsed time to collect and parse one snapshot; not induced CPU overhead. */
  readonly collectionWallMs: number;
  /** Optional allowlisted GC counters, or an explicit unsupported reason. */
  readonly gc?: GoGcObservation;
}
export interface GoCorrelation {
  readonly run: RunResult;
  readonly points: readonly [ProfilePoint, ProfilePoint, ProfilePoint];
  readonly observedDelta: number;
  readonly duringCollectionWallMs: number;
  readonly warnings: readonly string[];
}
function requireActive(signal: AbortSignal): void {
  if (signal.aborted) throw new Error("Cancelled");
}
export async function captureGoLoadTimeline(
  capture: (phase: TimelinePhase, signal: AbortSignal) => Promise<CapturedGoProfile>,
  executeLoad: (signal: AbortSignal) => Promise<RunResult>,
  signal: AbortSignal,
  onProgress?: (phase: TimelinePhase) => void,
  captureGc?: (phase: TimelinePhase, signal: AbortSignal) => Promise<GoGcObservation>
): Promise<GoCorrelation> {
  requireActive(signal);
  const point = async (phase: TimelinePhase): Promise<ProfilePoint> => {
    requireActive(signal);
    onProgress?.(phase);
    const wallStart = performance.now();
    const profile = await capture(phase, signal);
    if (profile.kind !== "goroutine") throw new Error("Only goroutine stack snapshots are comparable");
    const snapshot = await readGoroutineSnapshot(profile.localPath);
    requireActive(signal);
    const gc = captureGc ? await captureGc(phase, signal) : undefined;
    requireActive(signal);
    const collectionWallMs = Math.max(0, performance.now() - wallStart);
    return { phase, profile, observedAt: profile.capturedAt, snapshot, collectionWallMs,
      ...(gc ? { gc } : {}) };
  };
  const before = await point("before");
  // Load starts AFTER before snapshot; the during snapshot is sampled while
  // the load is pending. It is observation, not a proof of the causal source.
  // The correlation owns the active load. Profiling errors must not leave it
  // running after the diagnostic operation has already failed.
  const loadController = new AbortController();
  const forwardAbort = (): void => loadController.abort();
  signal.addEventListener("abort", forwardAbort, { once: true });
  if (signal.aborted) forwardAbort();
  let load: Promise<RunResult>;
  try { load = executeLoad(loadController.signal); }
  catch (error) { signal.removeEventListener("abort", forwardAbort); throw error; }
  // Observe early rejection while the during-snapshot is being collected.
  void load.catch(() => undefined);
  let during: ProfilePoint;
  let result: RunResult;
  try {
    during = await point("during");
    result = await load;
  } catch (error) {
    loadController.abort();
    await load.catch(() => undefined);
    throw error;
  } finally {
    signal.removeEventListener("abort", forwardAbort);
  }
  const after = await point("after");
  return {
    run: result,
    points: [before, during, after],
    observedDelta: after.snapshot.observedStacks - before.snapshot.observedStacks,
    duringCollectionWallMs: during.collectionWallMs,
    warnings: [
      "Snapshots are sampled at three points, not a continuous trace.",
      "Profiling adds overhead and can affect measured P95 and throughput.",
      "Snapshot collection wall time is measured, but not the performance overhead induced in the target. A separate control experiment is required.",
      "Goroutine growth is not proof of a leak or a causal bottleneck.",
      "GC counters, when supported, include all concurrent application activity; changes do not establish a causal link to load or latency.",
    ],
  };
}

export function goCorrelationMarkdown(result: GoCorrelation): string {
  const safe = escapeMarkdownInline;
  const during = result.points[1];
  const rows = result.points.map(p => "| " + p.phase + " | " + safe(p.observedAt) +
    " | " + p.snapshot.observedStacks + " | " + p.profile.bytes +
    " | " + p.collectionWallMs.toFixed(2) + " |").join("\n");
  const gcRows = result.points.map(point => {
    const gc = point.gc;
    if (gc?.status !== "SUPPORTED") return "| " + point.phase +
      " | " + (gc?.status === "NOT_SUPPORTED" ? "NOT_SUPPORTED" : "NOT_COLLECTED") +
      " | — | — | — |";
    return "| " + point.phase + " | " + gc.metrics.numGc + " | " +
      gc.metrics.totalAllocBytes + " | " + gc.metrics.heapAllocBytes + " | " +
      (gc.metrics.pauseTotalNs / 1_000_000).toFixed(3) + " |";
  }).join("\n");
  const first = result.points[0].gc, last = result.points[2].gc;
  const comparable = first?.status === "SUPPORTED" && last?.status === "SUPPORTED" &&
    last.metrics.numGc >= first.metrics.numGc &&
    last.metrics.totalAllocBytes >= first.metrics.totalAllocBytes &&
    last.metrics.pauseTotalNs >= first.metrics.pauseTotalNs;
  const gcDelta = comparable
    ? "Observed before→after changes: " +
      (last.metrics.numGc - first.metrics.numGc) + " GC cycles; " +
      (last.metrics.totalAllocBytes - first.metrics.totalAllocBytes) + " allocated bytes; " +
      ((last.metrics.pauseTotalNs - first.metrics.pauseTotalNs) / 1_000_000).toFixed(3) +
      " ms cumulative GC pause (whole process, observational)."
    : "GC deltas INCONCLUSIVE/NOT_SUPPORTED: both endpoints must expose monotonic counters.";
  return [
    "# Saturivo — Go load-correlated runtime observations", "",
    "Scenario: " + safe(result.run.scenario.name),
    "Workload fingerprint: " + (result.run.scenarioHash ?? "legacy"),
    "Requests: " + result.run.metrics.requests,
    "Observed P95: " + result.run.metrics.p95Ms.toFixed(2) + " ms", "",
    "| Phase | Timestamp | Goroutine stacks | Profile bytes | Collection wall (ms) |",
    "|---|---|---:|---:|---:|", rows, "",
    "During-load snapshot collection: " + result.duringCollectionWallMs.toFixed(2) +
      " ms wall time (not a causal estimate of profiling overhead).", "",
    "Observed before→after change: " + (result.observedDelta >= 0 ? "+" : "") + result.observedDelta,
    "Observed during-load count: " + during.snapshot.observedStacks, "",
    "## Optional Go GC and allocation counters",
    "| Phase | GC cycles | Total allocated bytes | Heap bytes | Cumulative GC pause (ms) |",
    "|---|---:|---:|---:|---:|", gcRows, "", gcDelta, "",
    "## Important limitations", ...result.warnings.map(w => "- " + w), "",
    "Captured profile file paths stay in extension-private storage and are not included in this report.",
    "This is a timing correlation; it does not establish causation.",
  ].join("\n");
}
