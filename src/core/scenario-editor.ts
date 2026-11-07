import type { Scenario } from "./types";
import { validateScenario, type TargetPolicy } from "./validation";

type Fields = Readonly<Record<string, unknown>>;

function object(value: unknown): Fields {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid scenario editor message");
  }
  return value as Fields;
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(label + " must be an integer");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(label + " must be between " + min + " and " + max);
  }
  return number;
}

/**
 * Parse untrusted webview input, never accepting an arbitrary target or
 * a policy override from the webview. The active extension settings own both.
 */
export function parseScenarioEditorInput(
  raw: unknown, target: string, policy: TargetPolicy
): Scenario {
  const fields = object(raw);
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  if (!name || name.length > 80) throw new Error("Scenario name must be 1–80 characters");
  const method = fields.method;
  if (method !== "GET" && method !== "HEAD") throw new Error("Only GET and HEAD are supported");
  const model = fields.model;
  if (model !== "constant-vus" && model !== "constant-arrival-rate" &&
      model !== "ramping-vus") {
    throw new Error("Unsupported editor load model");
  }
  const durationSeconds = integer(fields.durationSeconds, "Duration", 5, 120);
  const virtualUsers = integer(fields.virtualUsers, "Virtual users", 1, policy.maxVirtualUsers);
  const maxRequests = integer(fields.maxRequests, "Request budget", 100, 100000);
  const p95 = integer(fields.maxP95Ms, "P95 SLO", 0, 120000);
  const warmupSeconds = integer(fields.warmupSeconds ?? "0", "Warm-up", 0, 30);
  const cooldownSeconds = integer(fields.cooldownSeconds ?? "0", "Cool-down", 0, 30);
  const stages = (() => {
    if (model !== "ramping-vus") return undefined;
    if (typeof fields.stages !== "string" || fields.stages.length > 160) {
      throw new Error("Ramping requires 2–8 duration:VUs stages");
    }
    const tokens = fields.stages.split(",");
    if (tokens.length < 2 || tokens.length > 8) {
      throw new Error("Ramping requires 2–8 duration:VUs stages");
    }
    return tokens.map(token => {
      const match = /^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$/.exec(token.trim());
      if (!match) throw new Error("Ramp stages must use duration:VUs format");
      const duration = integer(match[1], "Stage duration", 1, 120);
      const vus = integer(match[2], "Stage VUs", 0, virtualUsers);
      return { durationSeconds: duration, targetVus: vus };
    });
  })();
  const scenario: Scenario = {
    id: "custom-v2", name, target, method, model, workloadVersion: 2,
    durationSeconds, virtualUsers, maxRequests,
    ...(warmupSeconds > 0 ? { warmupSeconds } : {}),
    ...(cooldownSeconds > 0 ? { cooldownSeconds } : {}),
    ...(model === "constant-arrival-rate"
      ? { arrivalRate: integer(fields.arrivalRate, "Arrival rate", 1, 500) } : {}),
    ...(p95 > 0 ? { slo: { maxP95Ms: p95 } } : {}),
    ...(stages ? { stages } : {}),
  };
  return validateScenario(scenario, policy);
}
