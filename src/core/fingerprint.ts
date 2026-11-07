import { createHash } from "node:crypto";
import type { Scenario } from "./types";

/** Versioned workload identity. Excludes UI labels, clocks, output paths and run IDs. */
export function fingerprintScenario(scenario: Scenario): string {
  const canonical = JSON.stringify([
    "saturivo-scenario-v1",
    scenario.target,
    scenario.method,
    scenario.model,
    scenario.durationSeconds,
    scenario.virtualUsers,
    scenario.model === "constant-arrival-rate" ? scenario.arrivalRate ?? null : null,
  ]);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
