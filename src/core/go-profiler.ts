import { request } from "node:http";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isIP } from "node:net";

export type GoProfileKind = "cpu" | "heap" | "goroutine" | "mutex" | "block";
export interface CapturedGoProfile {
  readonly kind: GoProfileKind;
  readonly localPath: string;
  readonly bytes: number;
  readonly capturedAt: string;
}
const paths: Record<GoProfileKind, string> = {
  cpu: "/debug/pprof/profile?seconds=5",
  heap: "/debug/pprof/heap",
  goroutine: "/debug/pprof/goroutine?debug=2",
  mutex: "/debug/pprof/mutex",
  block: "/debug/pprof/block",
};

/** Profiling is restricted to literal loopback hosts regardless of load-test permissions. */
export function localPprofEndpoint(raw: string, kind: GoProfileKind): URL {
  if (!(kind in paths)) throw new Error("Unsupported Go profile type");
  let input: URL;
  try { input = new URL(raw); } catch { throw new Error("Invalid Go profiler URL"); }
  const host = input.hostname.replace(/^\[|\]$/g, "");
  if (input.protocol !== "http:" || (isIP(host) !== 4 || !host.startsWith("127.")) &&
    (isIP(host) !== 6 || host !== "::1")) {
    throw new Error("Go profiling requires a literal loopback HTTP address");
  }
  if (input.username || input.password || input.search || input.hash || input.pathname !== "/") {
    throw new Error("Go profiling expects only a local HTTP origin, without credentials, path or query");
  }
  return new URL(paths[kind], input.origin);
}

/** Collection is read-only, no redirects, bounded to 4 MiB and 15 seconds. */
export async function captureGoProfile(
  baseUrl: string, kind: GoProfileKind, storeDir: string, signal: AbortSignal
): Promise<CapturedGoProfile> {
  if (signal.aborted) throw new Error("Cancelled");
  const url = localPprofEndpoint(baseUrl, kind);
  const data = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let count = 0;
    let settled = false;
    const finish = (error?: Error, body?: Buffer): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error); else resolve(body ?? Buffer.alloc(0));
    };
    const req = request(url, { method: "GET", headers: { Accept: "application/octet-stream" } }, res => {
      if (res.statusCode !== 200) {
        res.resume();
        finish(new Error("Go profiler HTTP status " + String(res.statusCode)));
        return;
      }
      res.on("data", (part: Buffer) => {
        count += part.byteLength;
        if (count > 4_000_000) {
          req.destroy(new Error("Go profile exceeds 4 MB"));
          return;
        }
        chunks.push(part);
      });
      res.once("end", () => finish(undefined, Buffer.concat(chunks)));
      res.once("error", e => finish(e));
    });
    const onAbort = (): void => req.destroy(new Error("Cancelled"));
    const timer = setTimeout(() => req.destroy(new Error("Go profile deadline exceeded")), 15_000);
    req.once("error", e => finish(e));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    req.end();
  });
  if (signal.aborted) throw new Error("Cancelled");
  if (data.length < 1) throw new Error("Go profiler returned an empty response");
  const id = randomUUID();
  const directory = join(storeDir, "go-profiles");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const suffix = kind === "goroutine" ? "txt" : "pprof";
  const localPath = join(directory, id + "-" + kind + "." + suffix);
  await writeFile(localPath, data, { mode: 0o600, flag: "wx" });
  return { kind, localPath, bytes: data.byteLength, capturedAt: new Date().toISOString() };
}
