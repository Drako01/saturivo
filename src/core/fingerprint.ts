import { createHash } from "node:crypto";
import type { Scenario } from "./types";

/** Versioned workload identity. Excludes UI labels, clocks, output paths and run IDs. */
export function fingerprintScenario(scenario: Scenario): string {
  const phased = (scenario.warmupSeconds ?? 0) > 0 || (scenario.cooldownSeconds ?? 0) > 0;
  const version = phased && scenario.workloadVersion === 2 ? "saturivo-scenario-v4" :
    scenario.workloadVersion === 2 ? "saturivo-scenario-v3" :
    scenario.slo || scenario.maxRequests !== undefined ?
    "saturivo-scenario-v2" : "saturivo-scenario-v1";
  const canonical = JSON.stringify([
    version,
    scenario.target,
    scenario.method,
    scenario.model,
    scenario.durationSeconds,
    scenario.virtualUsers,
    scenario.model === "constant-arrival-rate" ? scenario.arrivalRate ?? null : null,
    ...(version !== "saturivo-scenario-v1" ? [scenario.maxRequests ?? null,
      scenario.slo?.maxP95Ms ?? null, scenario.slo?.maxP99Ms ?? null,
      scenario.slo?.maxErrorPercent ?? null, scenario.slo?.minThroughputRps ?? null] : []),
    ...(version === "saturivo-scenario-v3" || version === "saturivo-scenario-v4" ?
      [scenario.stages?.map(stage => [stage.durationSeconds, stage.targetVus])] : []),
    ...(version === "saturivo-scenario-v4" ? [scenario.warmupSeconds ?? 0,
      scenario.cooldownSeconds ?? 0] : []),
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
