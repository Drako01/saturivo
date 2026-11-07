import { request } from "node:http";
import { localPprofEndpoint } from "./go-profiler";

export interface GoGcCounters {
  readonly numGc: number;
  readonly totalAllocBytes: number;
  readonly heapAllocBytes: number;
  readonly pauseTotalNs: number;
}
export type GoGcObservation =
  | { readonly status: "SUPPORTED"; readonly metrics: GoGcCounters }
  | { readonly status: "NOT_SUPPORTED"; readonly reason: string };

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}
function counter(raw: unknown): number | undefined {
  return typeof raw === "number" && Number.isSafeInteger(raw) && raw >= 0 ? raw : undefined;
}

/**
 * Parse only four explicitly allowlisted runtime counters from an expvar
 * document. Never record or export arbitrary application expvar keys.
 */
export function parseGoGcMetrics(raw: unknown): GoGcObservation {
  const memstats = object(object(raw)?.memstats);
  if (!memstats) return { status: "NOT_SUPPORTED", reason: "Go expvar memstats are not exposed" };
  const numGc = counter(memstats.NumGC);
  const totalAllocBytes = counter(memstats.TotalAlloc);
  const heapAllocBytes = counter(memstats.HeapAlloc);
  const pauseTotalNs = counter(memstats.PauseTotalNs);
  if (numGc === undefined || totalAllocBytes === undefined ||
      heapAllocBytes === undefined || pauseTotalNs === undefined) {
    return { status: "NOT_SUPPORTED", reason: "Go expvar GC counters are incomplete or unsafe" };
  }
  return { status: "SUPPORTED",
    metrics: { numGc, totalAllocBytes, heapAllocBytes, pauseTotalNs } };
}

const MAX_EXPVAR_BYTES = 65_536;

/** A direct no-proxy local GET. Any redirect/oversize/status != 200 is unavailable. */
function requestLocalExpvar(url: URL, signal: AbortSignal): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;
    let total = 0;
    const chunks: Buffer[] = [];
    const finish = (body?: Buffer | null, error?: Error): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error); else resolve(body ?? null);
    };
    const req = request(url, { method: "GET", agent: false,
      headers: { Accept: "application/json" } }, res => {
      if (res.statusCode !== 200) {
        res.destroy();
        finish(null);
        return;
      }
      const length = Number(res.headers["content-length"]);
      if (Number.isFinite(length) && length > MAX_EXPVAR_BYTES) {
        req.destroy(new Error("Go expvar exceeds response budget"));
        return;
      }
      res.on("data", (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > MAX_EXPVAR_BYTES) {
          req.destroy(new Error("Go expvar exceeds response budget"));
          return;
        }
        chunks.push(chunk);
      });
      res.once("end", () => finish(Buffer.concat(chunks, total)));
      res.once("error", error => finish(undefined, error));
    });
    const onAbort = (): void => { req.destroy(new Error("Cancelled")); };
    req.once("error", error => finish(undefined, error));
    timeout = setTimeout(() => req.destroy(new Error("Go expvar deadline exceeded")), 3000);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort(); else req.end();
  });
}

/**
 * Optional, opt-in companion of Go pprof correlation. Never redirects,
 * proxies, resolves hostnames or sends a request to remote/private networks.
 */
export async function readGoGcMetrics(baseUrl: string, signal: AbortSignal): Promise<GoGcObservation> {
  if (signal.aborted) throw new Error("Cancelled");
  const endpoint = localPprofEndpoint(baseUrl, "goroutine");
  endpoint.pathname = "/debug/vars";
  endpoint.search = "";
  let payload: Buffer | null;
  try {
    payload = await requestLocalExpvar(endpoint, signal);
  } catch {
    if (signal.aborted) throw new Error("Cancelled");
    return { status: "NOT_SUPPORTED",
      reason: "Local Go expvar endpoint was unavailable, oversized or timed out" };
  }
  if (!payload) return { status: "NOT_SUPPORTED",
    reason: "Local Go expvar endpoint did not return HTTP 200" };
  try {
    return parseGoGcMetrics(JSON.parse(payload.toString("utf8")) as unknown);
  } catch {
    return { status: "NOT_SUPPORTED", reason: "Local Go expvar response is not valid JSON" };
  }
}
