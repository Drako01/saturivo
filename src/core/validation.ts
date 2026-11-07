import { isIP } from "node:net";
import type { Scenario } from "./types";
import { assertValidSlo } from "./slo";

export interface TargetPolicy {
  readonly allowRemoteTargets: boolean;
  readonly maxVirtualUsers: number;
  readonly maxRequests?: number;
}

export function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (normalized === "localhost" || normalized === "::1") return true;
  if (isIP(normalized) !== 4) return false;
  const octets = normalized.split(".").map(Number);
  return octets.length === 4 && octets[0] === 127;
}

export function assertAllowedTarget(raw: string, policy: TargetPolicy): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid target URL"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only http(s) targets are supported");
  if (url.username || url.password) throw new Error("Credentials inside target URLs are not permitted");
  if (url.hash) throw new Error("URL fragments are not supported");
  if (!policy.allowRemoteTargets && !isLoopbackHost(url.hostname)) {
    throw new Error("Remote targets are disabled. Enable them explicitly in Saturivo settings.");
  }
  return url;
}

export function validateScenario(input: Scenario, policy: TargetPolicy): Scenario {
  assertAllowedTarget(input.target, policy);
  if (input.method !== "GET" && input.method !== "HEAD") throw new Error("Only read-only GET/HEAD requests are supported");
  if (!["constant-vus", "constant-arrival-rate", "ramping-vus"].includes(input.model)) throw new Error("Unsupported load model");
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 5 || input.durationSeconds > 120) throw new Error("Duration must be 5–120 seconds");
  if (!Number.isInteger(policy.maxVirtualUsers) || policy.maxVirtualUsers < 1 || policy.maxVirtualUsers > 100) throw new Error("Invalid hard virtual-user ceiling");
  if (!Number.isInteger(input.virtualUsers) || input.virtualUsers < 1 || input.virtualUsers > policy.maxVirtualUsers) throw new Error("Virtual users exceed the configured safety ceiling");
  if (input.model === "constant-arrival-rate" &&
    (!Number.isInteger(input.arrivalRate) || (input.arrivalRate ?? 0) < 1 || (input.arrivalRate ?? 0) > 500)) {
    throw new Error("Arrival rate must be between 1 and 500 iterations/s");
  }
  if (input.model === "ramping-vus") {
    if (input.workloadVersion !== 2 || !Array.isArray(input.stages) ||
      input.stages.length < 2 || input.stages.length > 8) {
      throw new Error("Ramping workloads require version 2 and 2–8 stages");
    }
    const stages = input.stages;
    for (const stage of stages) {
      if (!Number.isInteger(stage.durationSeconds) || stage.durationSeconds < 1 ||
        !Number.isInteger(stage.targetVus) || stage.targetVus < 0 ||
        stage.targetVus > input.virtualUsers) {
        throw new Error("Invalid ramp stage duration or target VUs");
      }
    }
    if (stages.reduce((sum, stage) => sum + stage.durationSeconds, 0) !== input.durationSeconds) {
      throw new Error("Ramp stages must sum to scenario duration");
    }
  } else if (input.stages !== undefined || input.workloadVersion !== undefined) {
    throw new Error("Ramping stage definitions require the ramping-vus model");
  }
  const maxRequests = input.maxRequests ?? policy.maxRequests ?? 10000;
  if (!Number.isInteger(maxRequests) || maxRequests < 100 || maxRequests > 100000) {
    throw new Error("Maximum requests must be 100–100000");
  }
  if (policy.maxRequests !== undefined && maxRequests > policy.maxRequests) {
    throw new Error("Scenario exceeds configured request budget");
  }
  if (input.slo) assertValidSlo(input.slo);
  if (!input.id || !input.name || input.name.length > 80) throw new Error("Invalid scenario identity");
  return { ...input, maxRequests };
}

export function isRemoteTarget(raw: string): boolean {
  const host = new URL(raw).hostname;
  return !isLoopbackHost(host);
}
