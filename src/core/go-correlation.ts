import type { CapturedGoProfile } from "./go-profiler";
import { readGoroutineSnapshot, type GoroutineSnapshot } from "./go-profile-analysis";
import type { RunResult } from "./types";

export type TimelinePhase = "before" | "during" | "after";
export interface ProfilePoint {
  readonly phase: TimelinePhase;
  readonly observedAt: string;
  readonly snapshot: GoroutineSnapshot;
  readonly profile: CapturedGoProfile;
}
export interface GoCorrelation {
  readonly run: RunResult;
  readonly points: readonly [ProfilePoint, ProfilePoint, ProfilePoint];
  readonly observedDelta: number;
  readonly warnings: readonly string[];
}
function requireActive(signal: AbortSignal): void {
  if (signal.aborted) throw new Error("Cancelled");
}
export async function captureGoLoadTimeline(
  capture: (phase: TimelinePhase, signal: AbortSignal) => Promise<CapturedGoProfile>,
  executeLoad: (signal: AbortSignal) => Promise<RunResult>,
  signal: AbortSignal,
  onProgress?: (phase: TimelinePhase) => void
): Promise<GoCorrelation> {
  requireActive(signal);
  const point = async (phase: TimelinePhase): Promise<ProfilePoint> => {
    requireActive(signal);
    onProgress?.(phase);
    const profile = await capture(phase, signal);
    if (profile.kind !== "goroutine") throw new Error("Only goroutine stack snapshots are comparable");
    const snapshot = await readGoroutineSnapshot(profile.localPath);
    requireActive(signal);
    return { phase, profile, observedAt: profile.capturedAt, snapshot };
  };
  const before = await point("before");
  // Load starts AFTER before snapshot; the during snapshot is sampled while
  // the load is pending. It is observation, not a proof of the causal source.
  const load = executeLoad(signal);
  let during: ProfilePoint;
  let result: RunResult;
  try {
    during = await point("during");
    result = await load;
  } catch (error) {
    // A rejected load promise is observed even if profiling failed first.
    await load.catch(() => undefined);
    throw error;
  }
  const after = await point("after");
  return {
    run: result,
    points: [before, during, after],
    observedDelta: after.snapshot.observedStacks - before.snapshot.observedStacks,
    warnings: [
      "Snapshots are sampled at three points, not a continuous trace.",
      "Profiling adds overhead and can affect measured P95 and throughput.",
      "Goroutine growth is not proof of a leak or a causal bottleneck.",
    ],
  };
}

export function goCorrelationMarkdown(result: GoCorrelation): string {
  const during = result.points[1];
  const rows = result.points.map(p => "| " + p.phase + " | " + p.observedAt +
    " | " + p.snapshot.observedStacks + " | " + p.profile.bytes + " |").join("\n");
  return [
    "# Saturivo — Go load-correlated runtime observations", "",
    "Scenario: " + result.run.scenario.name,
    "Workload fingerprint: " + (result.run.scenarioHash ?? "legacy"),
    "Requests: " + result.run.metrics.requests,
    "Observed P95: " + result.run.metrics.p95Ms.toFixed(2) + " ms", "",
    "| Phase | Timestamp | Goroutine stacks | Profile bytes |",
    "|---|---|---:|---:|", rows, "",
    "Observed before→after change: " + (result.observedDelta >= 0 ? "+" : "") + result.observedDelta,
    "Observed during-load count: " + during.snapshot.observedStacks, "",
    "## Important limitations", ...result.warnings.map(w => "- " + w), "",
    "Captured profile file paths stay in extension-private storage and are not included in this report.",
    "This is a timing correlation; it does not establish causation.",
  ].join("\n");
}
