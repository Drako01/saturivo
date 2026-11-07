import type { Metrics } from "./types";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
function metric(root: Record<string, unknown>, key: string): Record<string, unknown> {
  return object(object(root[key]).values);
}

export function readK6Summary(raw: unknown): Metrics {
  const metrics = object(object(raw).metrics);
  const durations = metric(metrics, "http_req_duration");
  const requests = metric(metrics, "http_reqs");
  const failures = metric(metrics, "http_req_failed");
  const dropped = metric(metrics, "dropped_iterations");
  const count = finite(requests.count);
  if (count === 0) throw new Error("k6 produced no HTTP requests; results cannot be interpreted");
  const p95 = finite(durations["p(95)"]);
  if (!p95) throw new Error("k6 summary is missing p(95) latency");
  return {
    requests: count,
    requestsPerSecond: finite(requests.rate),
    failedRate: Math.min(1, finite(failures.rate)),
    avgMs: finite(durations.avg),
    p50Ms: finite(durations.med),
    p95Ms: p95,
    p99Ms: finite(durations["p(99)"]),
    droppedIterations: finite(dropped.count),
  };
}
