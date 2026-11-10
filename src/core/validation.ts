import { LIMITS } from "./limits";
import { isIP } from "node:net";
import type { Scenario } from "./types";
import { assertValidSlo } from "./slo";
import { isPublicIp } from "./network-safety";

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
  if (!isLoopbackHost(url.hostname)) {
    if (!policy.allowRemoteTargets) {
      throw new Error("Remote targets are disabled. Enable them explicitly in Saturivo settings.");
    }
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) && !isPublicIp(host)) {
      throw new Error("Private or special-use remote IP is prohibited");
    }
  }
  return url;
}

export function validateScenario(input: Scenario, policy: TargetPolicy): Scenario {
  assertAllowedTarget(input.target, policy);
  if (input.method !== "GET" && input.method !== "HEAD") throw new Error("Only read-only GET/HEAD requests are supported");
  if (!["constant-vus", "constant-arrival-rate", "ramping-vus"].includes(input.model)) throw new Error("Unsupported load model");
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < LIMITS.duration.min || input.durationSeconds > LIMITS.duration.max) throw new Error("Duration must be 5–120 seconds");
  if (!Number.isInteger(policy.maxVirtualUsers) || policy.maxVirtualUsers < LIMITS.virtualUsers.min || policy.maxVirtualUsers > LIMITS.virtualUsers.max) throw new Error("Invalid hard virtual-user ceiling");
  if (!Number.isInteger(input.virtualUsers) || input.virtualUsers < LIMITS.virtualUsers.min || input.virtualUsers > policy.maxVirtualUsers) throw new Error("Virtual users exceed the configured safety ceiling");
  if (input.model === "constant-arrival-rate" &&
    (!Number.isInteger(input.arrivalRate) || (input.arrivalRate ?? 0) < LIMITS.arrivalRate.min || (input.arrivalRate ?? 0) > LIMITS.arrivalRate.max)) {
    throw new Error("Arrival rate must be between 1 and 500 iterations/s");
  }
  if (input.model === "ramping-vus") {
    if (input.workloadVersion !== 2 || !Array.isArray(input.stages) ||
      input.stages.length < LIMITS.stageCount.min || input.stages.length > LIMITS.stageCount.max) {
      throw new Error("Ramping workloads require version 2 and 2–8 stages");
    }
    const stages = input.stages;
    for (const stage of stages) {
      if (!Number.isInteger(stage.durationSeconds) || stage.durationSeconds < LIMITS.stageDuration.min ||
        !Number.isInteger(stage.targetVus) || stage.targetVus < 0 ||
        stage.targetVus > input.virtualUsers) {
        throw new Error("Invalid ramp stage duration or target VUs");
      }
    }
    if (stages.reduce((sum, stage) => sum + stage.durationSeconds, 0) !== input.durationSeconds) {
      throw new Error("Ramp stages must sum to scenario duration");
    }
  } else {
    if (input.stages !== undefined) {
      throw new Error("Ramping stage definitions require the ramping-vus model");
    }
    if (input.workloadVersion !== undefined && input.workloadVersion !== 2) {
      throw new Error("Unsupported workload version");
    }
  }
  const warmup = input.warmupSeconds ?? 0;
  const cooldown = input.cooldownSeconds ?? 0;
  if (input.warmupSeconds !== undefined || input.cooldownSeconds !== undefined) {
    if (input.workloadVersion !== 2) throw new Error("Load phases require workload version 2");
    if (!Number.isInteger(warmup) || warmup < LIMITS.phases.min || warmup > LIMITS.phases.max ||
        !Number.isInteger(cooldown) || cooldown < LIMITS.phases.min || cooldown > LIMITS.phases.max ||
        warmup + cooldown > input.durationSeconds - LIMITS.phases.minMeasured) {
      throw new Error("Warm-up and cool-down must allow at least 5 measured seconds");
    }
  }
  const maxRequests = input.maxRequests ?? policy.maxRequests ?? LIMITS.maxRequests.default;
  if (!Number.isInteger(maxRequests) || maxRequests < LIMITS.maxRequests.min || maxRequests > LIMITS.maxRequests.max) {
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
