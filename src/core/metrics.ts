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

export function readK6Summary(raw: unknown, targetArrivalRate?: number,
  measurementSeconds?: number): Metrics {
  const phased = measurementSeconds !== undefined;
  if (phased && (!Number.isFinite(measurementSeconds) || measurementSeconds! < 5 ||
      measurementSeconds! > 120)) throw new Error("Invalid measured load window");
  const metrics = object(object(raw).metrics);
  const suffix = phased ? "{saturivo_phase:measurement}" : "";
  const durations = metric(metrics, "http_req_duration" + suffix);
  const requests = metric(metrics, "http_reqs" + suffix);
  const failures = metric(metrics, "http_req_failed" + suffix);
  const total = metric(metrics, "http_reqs");
  const dropped = metric(metrics, "dropped_iterations");
  const count = finite(requests.count);
  if (count === 0) throw new Error("k6 produced no HTTP requests; results cannot be interpreted");
  // Missing HTTP metrics are not zeros: incomplete evidence cannot claim success.
  const required = [requests.rate, failures.rate, durations.avg, durations.med,
    durations["p(95)"], durations["p(99)"]];
  if (required.some(value => typeof value !== "number" || !Number.isFinite(value) || value < 0) ||
      !Number.isInteger(count) || (failures.rate as number) > 1) {
    throw new Error("k6 summary is missing or corrupt required HTTP metrics");
  }
  const p95 = finite(durations["p(95)"]);
  if (!p95) throw new Error("k6 summary is missing p(95) latency");
  const prefix = phased ? "saturivo_measure_status_" : "saturivo_status_";
  if (phased) {
    const totalCount = total.count;
    if (typeof totalCount !== "number" || !Number.isInteger(totalCount) ||
        totalCount < count) {
      throw new Error("k6 summary is missing the full-run request budget count");
    }
  }
  // k6 omits counters with zero observations; present counters must still
  // reconcile exactly with HTTP responses, in both phased and legacy runs.
  const buckets = ["1xx", "2xx", "3xx", "4xx", "5xx", "unknown"] as const;
  const hasStatuses = buckets.some(key => Object.hasOwn(metrics, prefix + key));
  if (phased && !hasStatuses) throw new Error("k6 measured HTTP status evidence is incomplete");
  if (hasStatuses) {
    let observed = 0;
    for (const key of buckets) {
      if (!Object.hasOwn(metrics, prefix + key)) continue;
      const value = metric(metrics, prefix + key).count;
      if (!Number.isInteger(value) || (value as number) < 0) {
        throw new Error("k6 HTTP status evidence has an invalid counter");
      }
      observed += value as number;
    }
    if (observed !== count) throw new Error("k6 HTTP status evidence is incomplete");
  }
  if (Object.hasOwn(metrics, "dropped_iterations") &&
      (!Number.isInteger(dropped.count) || (dropped.count as number) < 0)) {
    throw new Error("k6 dropped-iteration evidence is invalid");
  }
  return {
    requests: count,
    // k6 submetric .rate is computed over the whole run, including excluded phases.
    requestsPerSecond: phased ? count / measurementSeconds! : finite(requests.rate),
    ...(phased ? { totalRequests: finite(total.count) } : {}),
    failedRate: Math.min(1, finite(failures.rate)),
    avgMs: finite(durations.avg),
    p50Ms: finite(durations.med),
    p95Ms: p95,
    p99Ms: finite(durations["p(99)"]),
    droppedIterations: finite(dropped.count),
    ...(targetArrivalRate !== undefined ? {
      targetArrivalRate, achievedArrivalRate: phased ? count / measurementSeconds! : finite(requests.rate),
    } : {}),
    ...(hasStatuses ? {
      statusDistribution: {
        "1xx": finite(metric(metrics, prefix + "1xx").count),
        "2xx": finite(metric(metrics, prefix + "2xx").count),
        "3xx": finite(metric(metrics, prefix + "3xx").count),
        "4xx": finite(metric(metrics, prefix + "4xx").count),
        "5xx": finite(metric(metrics, prefix + "5xx").count),
        unknown: finite(metric(metrics, prefix + "unknown").count),
      },
    } : {}),
  };
}
