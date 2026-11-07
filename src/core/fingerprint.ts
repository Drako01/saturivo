import { createHash } from "node:crypto";
import type { Scenario } from "./types";

/** Versioned workload identity. Excludes UI labels, clocks, output paths and run IDs. */
export function fingerprintScenario(scenario: Scenario): string {
  const version = scenario.slo ? "saturivo-scenario-v2" : "saturivo-scenario-v1";
  const canonical = JSON.stringify([
    version,
    scenario.target,
    scenario.method,
    scenario.model,
    scenario.durationSeconds,
    scenario.virtualUsers,
    scenario.model === "constant-arrival-rate" ? scenario.arrivalRate ?? null : null,
    ...(scenario.slo ? [scenario.slo.maxP95Ms ?? null, scenario.slo.maxP99Ms ?? null,
      scenario.slo.maxErrorPercent ?? null, scenario.slo.minThroughputRps ?? null] : []),
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
