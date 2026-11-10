import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseScenarioEditorInput } from "../src/core/scenario-editor";
import { isStoredRun } from "../src/core/history";
import { validateScenario } from "../src/core/validation";
import type { Scenario, RunResult } from "../src/core/types";

const policy = { allowRemoteTargets: false, maxVirtualUsers: 100, maxRequests: 10000 };
let seed = 0x5a7f13b9;
function next(max: number): number {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) % max;
}

test("10,000 deterministic adversarial editor inputs never bypass validation", () => {
  const safe = {
    name: "Property test", method: "GET", model: "constant-vus",
    durationSeconds: "10", virtualUsers: "5", maxRequests: "1000",
    maxP95Ms: "250", warmupSeconds: "0", cooldownSeconds: "0",
  };
  const invalidValues = ["-1", "Infinity", "NaN", "1e6", "1.5", "", " 10", "0x10",
    "null", "{}", "99999999999999999999"];
  const names = ["durationSeconds", "virtualUsers", "maxRequests", "maxP95Ms",
    "warmupSeconds", "cooldownSeconds"] as const;
  for (let i = 0; i < 10000; i++) {
    const name = names[next(names.length)]!;
    const value = invalidValues[next(invalidValues.length)]!;
    const candidate = { ...safe, [name]: value };
    assert.throws(() => parseScenarioEditorInput(candidate, "http://127.0.0.1/", policy),
      /must be an integer/, "seeded input " + i + " must reject " + name);
  }
});

test("all 1,000 sampled accepted scenarios can be represented as validated stored evidence", () => {
  for (let i = 0; i < 1000; i++) {
    const durationSeconds = 5 + next(116);
    const virtualUsers = 1 + next(100);
    const model = ["constant-vus", "constant-arrival-rate", "ramping-vus"][next(3)] as Scenario["model"];
    const scenario: Scenario = {
      id: "property-run", name: "Property", method: "GET",
      target: "http://127.0.0.1:8080/", model, durationSeconds, virtualUsers,
      workloadVersion: 2, maxRequests: 10000,
      ...(model === "constant-arrival-rate" ? { arrivalRate: 1 + next(500) } : {}),
      ...(model === "ramping-vus" ? { stages: [
        { durationSeconds: 1, targetVus: virtualUsers },
        { durationSeconds: durationSeconds - 1, targetVus: 0 },
      ] } : {}),
    };
    const accepted = validateScenario(scenario, policy);
    const run: RunResult = {
      id: "11111111-1111-4111-8111-111111111111", schemaVersion: 2,
      engine: "k6", startedAt: "2026-11-10T11:00:00Z", endedAt: "2026-11-10T11:00:30Z",
      scenario: accepted,
      metrics: { requests: 10, requestsPerSecond: 1, failedRate: 0,
        avgMs: 1, p50Ms: 1, p95Ms: 2, p99Ms: 3, droppedIterations: 0 },
      environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 4 },
      warnings: [],
    };
    assert(isStoredRun(run), "accepted scenario must not be rejected by historical schema: " + i);
  }
});
