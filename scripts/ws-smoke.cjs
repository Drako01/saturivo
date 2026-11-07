"use strict";
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { runWebSocketProbe } = require("../out/src/core/websocket.js");

async function main() {
  const temp = await mkdtemp(join(tmpdir(), "saturivo-websocket-"));
  const child = spawn(process.execPath, [join(__dirname, "fixtures", "websocket-server.cjs")], {
    cwd: resolve(__dirname, ".."), shell: false, windowsHide: true,
  });
  const controller = new AbortController();
  try {
    const port = await new Promise((resolvePort, rejectPort) => {
      let text = "";
      const deadline = setTimeout(() => rejectPort(new Error("WebSocket fixture startup timeout")), 10000);
      child.on("error", error => { clearTimeout(deadline); rejectPort(error); });
      child.on("exit", code => { clearTimeout(deadline); rejectPort(new Error("Fixture exit " + code)); });
      child.stdout.on("data", bytes => {
        text += bytes.toString("utf8");
        const match = /SATURIVO_PORT=(\d+)/.exec(text);
        if (match) { clearTimeout(deadline); resolvePort(Number(match[1])); }
      });
    });
    const outcome = await runWebSocketProbe("ws://127.0.0.1:" + port + "/socket",
      "k6", temp, controller.signal);
    assert(outcome.sessions >= 5, "Expected real WebSocket sessions");
    assert.equal(outcome.successfulHandshakesPercent, 100, "Expected complete handshakes");
    assert(outcome.messagesReceived >= 1, "Expected actual WebSocket frames");
    console.log("Real WebSocket k6 loopback integration: PASS; sessions=" +
      outcome.sessions + " messages=" + outcome.messagesReceived);
  } finally {
    controller.abort();
    child.kill("SIGTERM");
    await rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
