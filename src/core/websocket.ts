import { saturivoVersion } from "./version";
import { CancelledError } from "./cancelled-error";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { readBoundedRegularTextFile } from "./bounded-file";
import { join } from "node:path";
import { isLoopbackHost } from "./validation";
import { runBoundedProcess } from "./process";

export interface WebSocketObservation {
  readonly protocol: "websocket";
  readonly target: string;
  readonly sessions: number;
  readonly sessionsPerSecond: number;
  readonly successfulHandshakesPercent: number;
  readonly messagesReceived: number;
  readonly p95SessionMs: number | null;
  readonly warnings: readonly string[];
}

export function validateWebSocketTarget(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error("Invalid WebSocket URL"); }
  if (url.protocol !== "ws:") throw new Error("WebSocket probe requires a ws:// loopback endpoint");
  if (!isLoopbackHost(url.hostname)) throw new Error("WebSocket probe is restricted to loopback");
  if (url.username || url.password || url.hash) {
    throw new Error("WebSocket credentials and URL fragments are not permitted");
  }
  return url;
}

export function renderWebSocketProbe(raw: string, output: string): string {
  const url = validateWebSocketTarget(raw);
  const host = url.hostname.toLowerCase();
  const hosts = host === "localhost" || host === "localhost."
    ? { localhost: "127.0.0.1", "localhost.": "127.0.0.1" } : {};
  const options = {
    scenarios: { probe: { executor: "constant-vus", vus: 1, duration: "5s" } },
    summaryTrendStats: ["avg", "med", "p(95)", "p(99)"],
    hosts,
    userAgent: "Saturivo/" + saturivoVersion(),
  };
  return [
    'import ws from "k6/ws";',
    'import { check, sleep } from "k6";',
    'import exec from "k6/execution";',
    "export const options = " + JSON.stringify(options) + ";",
    "export default function () {",
    "  if (exec.scenario.iterationInTest >= 100) { sleep(1); return; }",
    "  const response = ws.connect(" + JSON.stringify(url.toString()) + ", {}, socket => {",
    "    socket.on('open', () => socket.send('saturivo-probe'));",
    "    socket.on('message', () => socket.close());",
    "    socket.setTimeout(() => socket.close(), 1000);",
    "  });",
    "  check(response, { 'handshake 101': r => Boolean(r && r.status === 101) });",
    "}",
    "export function handleSummary(data) {",
    "  return { [" + JSON.stringify(output) + "]: JSON.stringify(data) };",
    "}",
  ].join("\n");
}
function metric(raw: unknown, name: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const root = (raw as { metrics?: Record<string, { values?: Record<string, unknown> }> }).metrics;
  return root?.[name]?.values ?? {};
}
function nonnegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : 0;
}
export function parseWebSocketSummary(raw: unknown, target: string): WebSocketObservation {
  const sessionsMetric = metric(raw, "ws_sessions");
  const sessions = nonnegative(sessionsMetric.count);
  if (!sessions) throw new Error("No WebSocket sessions were observed");
  const handshake = metric(raw, "checks");
  const success = handshake.rate;
  if (typeof success !== "number" || !Number.isFinite(success) || success < 0 || success > 1) {
    throw new Error("WebSocket handshake evidence is missing");
  }
  const duration = metric(raw, "ws_session_duration");
  const p95 = duration["p(95)"];
  return {
    protocol: "websocket", target, sessions,
    sessionsPerSecond: nonnegative(sessionsMetric.rate),
    successfulHandshakesPercent: Number((success * 100).toFixed(2)),
    messagesReceived: nonnegative(metric(raw, "ws_msgs_received").count),
    p95SessionMs: typeof p95 === "number" && Number.isFinite(p95) && p95 >= 0 ? p95 : null,
    warnings: [
      "Observed WebSocket session duration is not HTTP request latency.",
      "A successful handshake is not proof of application-level protocol correctness.",
      "This local probe is bounded to 100 sessions, 1 VU and 5 seconds.",
    ],
  };
}

/** Separate opt-in protocol adapter, no implicit execution and no remote targets. */
export async function runWebSocketProbe(
  raw: string, binary: string, storage: string, signal: AbortSignal
): Promise<WebSocketObservation> {
  validateWebSocketTarget(raw);
  if (signal.aborted) throw new CancelledError();
  const dir = join(storage, "temporary", randomUUID());
  await mkdir(dir, { recursive: true });
  const script = join(dir, "ws-probe.js");
  const summary = join(dir, "ws-summary.json");
  try {
    await writeFile(script, renderWebSocketProbe(raw, summary), { mode: 0o600 });
    const result = await runBoundedProcess({
      binary, args: ["run", "--quiet", script], cwd: dir,
      signal, timeoutMs: 30000, maxOutputBytes: 16000,
      env: {
        PATH: process.env.PATH, Path: process.env.Path, HOME: process.env.HOME,
        USERPROFILE: process.env.USERPROFILE, SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR,
        K6_NO_USAGE_REPORT: "true",
      },
    });
    if (result.exitCode !== 0) throw new Error("WebSocket k6 probe failed (" + result.exitCode + ")");
    return parseWebSocketSummary(JSON.parse(await readBoundedRegularTextFile(summary, 100000)) as unknown, raw);
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function webSocketReport(data: WebSocketObservation): string {
  return [
    "# Saturivo — WebSocket loopback probe", "",
    "Protocol: WebSocket (ws://, loopback only)",
    "Target: " + data.target,
    "Observed sessions: " + data.sessions,
    "Observed session rate: " + data.sessionsPerSecond.toFixed(2) + "/s",
    "Successful handshakes: " + data.successfulHandshakesPercent + "%",
    "Messages received: " + data.messagesReceived,
    "P95 session duration: " + (data.p95SessionMs === null ? "not available" :
      data.p95SessionMs.toFixed(2) + " ms"),
    "", "## Interpretation", ...data.warnings.map(value => "- " + value), "",
    "No external request is authorized by this report; review evidence before export.",
  ].join("\n");
}
