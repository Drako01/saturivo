export type LoadModel = "constant-vus" | "constant-arrival-rate";
export type HttpMethod = "GET" | "HEAD";

export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly target: string;
  readonly method: HttpMethod;
  readonly model: LoadModel;
  readonly durationSeconds: number;
  readonly virtualUsers: number;
  readonly arrivalRate?: number;
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
  readonly schemaVersion: 1;
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly engine: "k6";
  readonly scenario: Scenario;
  /** Added in the Phase 1 rollout; older schemaVersion 1 reports omit this field. */
  readonly scenarioHash?: string;
  readonly metrics: Metrics;
  readonly environment: {
    readonly platform: string;
    readonly arch: string;
    readonly node: string;
    readonly cpuCount: number;
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
