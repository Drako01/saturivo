import { LIMITS } from "./limits";
import { mkdir, readdir, rename, lstat, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { RunResult, Scenario, Metrics, SloDefinition } from "./types";
import { fingerprintScenario } from "./fingerprint";
import { assessSlo } from "./slo";
import { assertAllowedTarget } from "./validation";
import { assertValidSlo } from "./slo";
import { readBoundedRegularTextFile } from "./bounded-file";

const MAX_REPORT_BYTES = 100_000;
const ownedName = /^[0-9]{8,20}-[0-9a-f-]{8,80}\.json$/i;
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const shortString = (v: unknown, max = 2048): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;

/** Untrusted imported/history JSON is validated before it reaches comparison or HTML. */
export function isStoredRun(value: unknown): value is RunResult {
  if (!object(value) || (value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
      !shortString(value.id, 80) || !/^[a-z0-9-]{8,80}$/i.test(value.id) ||
      !shortString(value.startedAt, 40) || !shortString(value.endedAt, 40) ||
      !Number.isFinite(Date.parse(value.startedAt)) ||
      !Number.isFinite(Date.parse(value.endedAt)) ||
      Date.parse(value.endedAt) < Date.parse(value.startedAt) ||
      value.engine !== "k6") return false;
  const s = value.scenario, m = value.metrics, e = value.environment;
  if (!object(s) || !shortString(s.id, 80) || !shortString(s.name, 80) ||
      !shortString(s.target, 2048) || !["GET", "HEAD"].includes(String(s.method)) ||
      !["constant-vus", "constant-arrival-rate", "ramping-vus"].includes(String(s.model)) ||
      !Number.isInteger(s.durationSeconds) || (s.durationSeconds as number) < LIMITS.duration.min ||
      (s.durationSeconds as number) > LIMITS.duration.max ||
      !Number.isInteger(s.virtualUsers) || (s.virtualUsers as number) < LIMITS.virtualUsers.min ||
      (s.virtualUsers as number) > LIMITS.virtualUsers.max) return false;
  try { assertAllowedTarget(s.target as string, { allowRemoteTargets: true, maxVirtualUsers: LIMITS.virtualUsers.max }); }
  catch { return false; }
  if (s.workloadVersion !== undefined && s.workloadVersion !== 2) return false;
  const warmup = (s.warmupSeconds as number | undefined) ?? 0;
  const cooldown = (s.cooldownSeconds as number | undefined) ?? 0;
  if (s.warmupSeconds !== undefined || s.cooldownSeconds !== undefined) {
    if (s.workloadVersion !== 2 ||
        !Number.isInteger(warmup) || warmup < LIMITS.phases.min || warmup > LIMITS.phases.max ||
        !Number.isInteger(cooldown) || cooldown < LIMITS.phases.min || cooldown > LIMITS.phases.max ||
        warmup + cooldown > (s.durationSeconds as number) - LIMITS.phases.minMeasured) return false;
  }
  if (s.maxRequests !== undefined && (!Number.isInteger(s.maxRequests) ||
      (s.maxRequests as number) < LIMITS.maxRequests.min || (s.maxRequests as number) > LIMITS.maxRequests.max)) return false;
  if (s.slo !== undefined) {
    if (!object(s.slo)) return false;
    try { assertValidSlo(s.slo as SloDefinition); } catch { return false; }
  }
  if (s.model !== "ramping-vus" && s.stages !== undefined) return false;
  if (s.model === "constant-arrival-rate" && (!Number.isInteger(s.arrivalRate) ||
      (s.arrivalRate as number) < LIMITS.arrivalRate.min || (s.arrivalRate as number) > LIMITS.arrivalRate.max)) return false;
  if (s.model === "ramping-vus" && (s.workloadVersion !== 2 ||
      !Array.isArray(s.stages) || s.stages.length < LIMITS.stageCount.min || s.stages.length > LIMITS.stageCount.max ||
      !s.stages.every(st => object(st) && Number.isInteger(st.durationSeconds) &&
        (st.durationSeconds as number) >= LIMITS.stageDuration.min && Number.isInteger(st.targetVus) &&
        (st.targetVus as number) >= 0 && (st.targetVus as number) <= (s.virtualUsers as number)) ||
      s.stages.reduce((sum: number, st: { durationSeconds: number }) =>
        sum + st.durationSeconds, 0) !== s.durationSeconds)) return false;
  if (s.model !== "constant-arrival-rate" && s.arrivalRate !== undefined) return false;
  if (!object(m) ||
      !["requests", "requestsPerSecond", "failedRate", "avgMs", "p50Ms",
        "p95Ms", "p99Ms", "droppedIterations"].every(key => finite(m[key])) ||
      !Number.isInteger(m.requests) || (m.requests as number) < 1 ||
      (m.p95Ms as number) <= 0 || (m.failedRate as number) > 1 ||
      !Number.isInteger(m.droppedIterations)) return false;
  if (m.totalRequests !== undefined &&
      (!Number.isInteger(m.totalRequests) || (m.totalRequests as number) < (m.requests as number) ||
       (m.totalRequests as number) > ((s.maxRequests as number | undefined) ?? LIMITS.maxRequests.default))) return false;
  if (warmup + cooldown > 0 && m.totalRequests === undefined) return false;
  if (m.targetArrivalRate !== undefined && (!Number.isInteger(m.targetArrivalRate) ||
      (m.targetArrivalRate as number) < LIMITS.arrivalRate.min || (m.targetArrivalRate as number) > LIMITS.arrivalRate.max)) return false;
  if (m.achievedArrivalRate !== undefined && !finite(m.achievedArrivalRate)) return false;
  if (m.statusDistribution !== undefined) {
    if (!object(m.statusDistribution)) return false;
    const buckets = ["1xx", "2xx", "3xx", "4xx", "5xx", "unknown"] as const;
    if (Object.keys(m.statusDistribution).some(key => !buckets.includes(key as typeof buckets[number])) ||
        !buckets.every(key => {
          const value = (m.statusDistribution as Record<string, unknown>)[key];
          return Number.isInteger(value) && (value as number) >= 0;
        })) return false;
    if (value.schemaVersion === 2 && buckets.reduce((sum, key) =>
        sum + ((m.statusDistribution as Record<string, number>)[key] ?? 0), 0) !== m.requests) {
      return false;
    }
  }
  if (!object(e) || !shortString(e.platform, 100) || !shortString(e.arch, 100) ||
      !shortString(e.node, 100) || !Number.isInteger(e.cpuCount) ||
      (e.cpuCount as number) < 1 || (e.cpuCount as number) > 4096) return false;
  if (e.cpuModel !== undefined && !shortString(e.cpuModel, 256)) return false;
  if (e.k6Version !== undefined && !shortString(e.k6Version, 160)) return false;
  if (e.totalMemoryBytes !== undefined && !finite(e.totalMemoryBytes)) return false;
  for (const key of ["loadHostFingerprint", "environmentHash"] as const) {
    if (e[key] !== undefined && (typeof e[key] !== "string" ||
        !/^[a-f0-9]{64}$/.test(e[key] as string))) return false;
  }
  if (e.gitSha !== undefined && (typeof e.gitSha !== "string" ||
      !/^[a-f0-9]{40,64}$/.test(e.gitSha))) return false;
  if (!Array.isArray(value.warnings) || value.warnings.length > 40 ||
      !value.warnings.every(w => typeof w === "string" && w.length <= 4096)) return false;
  if (value.sloAssessment !== undefined) {
    const assessment = value.sloAssessment;
    if (!object(assessment) ||
        !["pass", "fail", "inconclusive", "not-configured"].includes(String(assessment.status)) ||
        !Array.isArray(assessment.violations) || assessment.violations.length > 30 ||
        !assessment.violations.every(v => typeof v === "string" && v.length <= 500)) return false;
    if (value.schemaVersion === 2) {
      const expected = assessSlo(m as unknown as Metrics, s.slo as SloDefinition | undefined,
        ((m.totalRequests ?? m.requests) as number) >= ((s.maxRequests as number | undefined) ?? LIMITS.maxRequests.default));
      if (assessment.status !== expected.status ||
          JSON.stringify(assessment.violations) !== JSON.stringify(expected.violations)) return false;
    }
  }
  if (value.scenarioHash !== undefined && (typeof value.scenarioHash !== "string" ||
      !/^[a-f0-9]{64}$/.test(value.scenarioHash))) return false;
  if (value.schemaVersion === 2 && value.scenarioHash !== undefined &&
      value.scenarioHash !== fingerprintScenario(s as unknown as Scenario)) return false;
  return true;
}


/**
 * Explicit import-time migration only: existing on-disk v1 records remain
 * byte-for-byte unchanged until the operator chooses to import them.
 * Legacy fields are preserved, while workload identity and optional SLO
 * assessments are re-established from the validated source evidence.
 */
export function migrateImportedRun(value: unknown): RunResult {
  if (!isStoredRun(value)) throw new Error("Invalid imported run evidence");
  if (value.schemaVersion === 2) return value;
  const fingerprint = fingerprintScenario(value.scenario);
  if (value.scenarioHash && value.scenarioHash !== fingerprint) {
    throw new Error("Legacy workload fingerprint mismatch");
  }
  const budget = value.scenario.maxRequests ?? LIMITS.maxRequests.default;
  const requestBudgetReached = (value.metrics.totalRequests ?? value.metrics.requests) >= budget;
  const migrated: RunResult = {
    ...value, schemaVersion: 2, scenarioHash: fingerprint,
    ...(value.sloAssessment
      ? { sloAssessment: assessSlo(value.metrics, value.scenario.slo, requestBudgetReached) }
      : {}),
  };
  // Do not silently convert v1 data that fails the stricter v2 evidence contract.
  if (!isStoredRun(migrated)) throw new Error("Legacy run cannot be safely migrated");
  return migrated;
}

export class HistoryStore {
  private readonly directory: string;
  private retention: number;
  constructor(baseDir: string, retention = 100) {
    this.directory = join(baseDir, "runs");
    this.retention = this.validRetention(retention);
  }
  private validRetention(keep: number): number {
    if (!Number.isInteger(keep) || keep < 1 || keep > 1000) {
      throw new Error("Invalid history retention");
    }
    return keep;
  }
  setRetention(keep: number): void { this.retention = this.validRetention(keep); }

  async save(run: RunResult): Promise<void> {
    if (!isStoredRun(run)) throw new Error("Invalid run evidence; refusing to save it");
    const json = JSON.stringify(run, null, 2);
    if (Buffer.byteLength(json) > MAX_REPORT_BYTES) throw new Error("Run evidence exceeds storage limit");
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const name = run.startedAt.replace(/[^0-9]/g, "") + "-" + run.id + ".json";
    if (!ownedName.test(name)) throw new Error("Invalid run filename");
    const target = join(this.directory, name);
    const temporary = join(this.directory, randomUUID() + ".tmp");
    try {
      await writeFile(temporary, json, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await rename(temporary, target);
    } finally {
      await unlink(temporary).catch(() => undefined);
    }
    await this.prune(this.retention);
  }

  private async ownedFiles(): Promise<string[]> {
    await mkdir(this.directory, { recursive: true });
    const filenames = (await readdir(this.directory))
      .filter(name => ownedName.test(name)).sort().reverse();
    const files: string[] = [];
    for (const name of filenames) {
      try {
        if ((await lstat(join(this.directory, name))).isFile()) files.push(name);
      } catch { /* Ignore files removed during a concurrent scan. */ }
    }
    return files;
  }

  async prune(keep: number): Promise<number> {
    this.validRetention(keep);
    const files = await this.ownedFiles();
    let deleted = 0;
    for (const name of files.slice(keep)) {
      await unlink(join(this.directory, name));
      deleted++;
    }
    return deleted;
  }

  async clear(): Promise<number> {
    const files = await this.ownedFiles();
    for (const name of files) await unlink(join(this.directory, name));
    return files.length;
  }

  async list(limit = 30): Promise<RunResult[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid history limit");
    const filenames = (await this.ownedFiles()).slice(0, 100);
    const runs: RunResult[] = [];
    for (const name of filenames) {
      try {
        const value: unknown = JSON.parse(
          await readBoundedRegularTextFile(join(this.directory, name), MAX_REPORT_BYTES));
        if (isStoredRun(value)) runs.push(value);
        if (runs.length >= limit) break;
      } catch { /* Corrupt, interrupted or hostile files do not crash the extension. */ }
    }
    return runs;
  }
}
