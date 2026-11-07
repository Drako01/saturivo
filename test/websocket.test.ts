import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseWebSocketSummary, renderWebSocketProbe, validateWebSocketTarget, webSocketReport } from "../src/core/websocket";

test("WebSocket probe rejects external targets, credentials, fragments and non-WS schemes", () => {
  for (const target of [
    "ws://169.254.169.254/", "wss://127.0.0.1/",
    "ws://localhost.evil.example/", "ws://127.0.0.1@evil.example/",
    "ws://user:pass@127.0.0.1/", "ws://127.0.0.1/#secret",
    "file:///tmp/socket",
  ]) assert.throws(() => validateWebSocketTarget(target));
  assert.equal(validateWebSocketTarget("ws://127.0.0.1:3000/socket").pathname, "/socket");
});

test("Generated WebSocket script is strictly bounded and pins localhost", () => {
  const script = renderWebSocketProbe("ws://localhost:4040/socket", "/tmp/ws.json");
  assert.match(script, /"localhost":"127\.0\.0\.1"/);
  assert.match(script, /constant-vus/);
  assert.match(script, /iterationInTest >= 100/);
  assert.match(script, /handshake 101/);
  assert.match(script, /socket\.setTimeout/);
  assert(!script.includes("169.254.169.254"));
});

test("WebSocket evidence uses honest session metrics, not HTTP latency", () => {
  const summary = { metrics: {
    ws_sessions: { values: { count: 123, rate: 20 } },
    checks: { values: { rate: 1 } },
    ws_msgs_received: { values: { count: 120 } },
    ws_session_duration: { values: { "p(95)": 15.5 } },
  } };
  const result = parseWebSocketSummary(summary, "ws://127.0.0.1/socket");
  assert.equal(result.sessions, 123);
  assert.equal(result.successfulHandshakesPercent, 100);
  assert.equal(result.p95SessionMs, 15.5);
  assert.match(webSocketReport(result), /not HTTP request latency/);
  assert.throws(() => parseWebSocketSummary({metrics:{}}, "ws://127.0.0.1/socket"), /No WebSocket/);
});
