export type LoadModel = "constant-vus" | "constant-arrival-rate" | "ramping-vus";
export interface RampStage { readonly durationSeconds: number; readonly targetVus: number; }
export type HttpMethod = "GET" | "HEAD";

export interface SloDefinition {
  readonly maxP95Ms?: number;
  readonly maxP99Ms?: number;
  readonly maxErrorPercent?: number;
  readonly minThroughputRps?: number;
}

export interface SloAssessment {
  readonly status: "pass" | "fail" | "inconclusive" | "not-configured";
  readonly violations: readonly string[];
}

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly target: string;
  readonly method: HttpMethod;
  readonly model: LoadModel;
  readonly durationSeconds: number;
  readonly virtualUsers: number;
  readonly arrivalRate?: number;
  readonly maxRequests?: number;
  readonly slo?: SloDefinition;
  /** Explicit workload v2 for staged/ramping profiles; omitted for legacy scenarios. */
  readonly workloadVersion?: 2;
  readonly stages?: readonly RampStage[];
}

export interface Metrics {
  readonly requests: number;
  readonly requestsPerSecond: number;
  readonly failedRate: number;
  readonly avgMs: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  readonly droppedIterations: number;
}

export interface RunResult {
  readonly schemaVersion: 1 | 2;
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly engine: "k6";
  readonly scenario: Scenario;
  /** Added in the Phase 1 rollout; older schemaVersion 1 reports omit this field. */
  readonly scenarioHash?: string;
  readonly sloAssessment?: SloAssessment;
  readonly metrics: Metrics;
  readonly environment: {
    readonly platform: string;
    readonly arch: string;
    readonly node: string;
    readonly cpuCount: number;
    readonly cpuModel?: string;
    readonly totalMemoryBytes?: number;
    readonly k6Version?: string;
  };
  readonly warnings: readonly string[];
}

export type ComparisonStatus = "improvement" | "regression" | "stable" | "inconclusive";

export interface Comparison {
  readonly status: ComparisonStatus;
  readonly comparable: boolean;
  readonly reasons: readonly string[];
  readonly deltaP95Percent: number;
  readonly deltaRpsPercent: number;
  readonly deltaFailedPercentagePoints: number;
}
