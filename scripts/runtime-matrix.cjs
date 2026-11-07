"use strict";
const assert = require("node:assert/strict");
const { mkdtemp, rm } = require("node:fs/promises");
const { spawn } = require("node:child_process");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const { runK6 } = require("../out/src/core/k6.js");
const { runBoundedProcess } = require("../out/src/core/process.js");

const root = resolve(__dirname, "..");
const policy = { allowRemoteTargets: false, maxVirtualUsers: 5, maxRequests: 2000 };

function startFixture(binary, args, cwd) {
  return new Promise((resolveStart, rejectStart) => {
    const child = spawn(binary, args, { cwd, shell: false, windowsHide: true,
      env: { ...process.env, PYTHONUNBUFFERED: "1" } });
    let output = "", resolved = false;
    const timer = setTimeout(() => fail(new Error("Loopback fixture startup deadline exceeded")), 10000);
    function fail(error) {
      clearTimeout(timer);
      if (!resolved) { resolved = true; child.kill(); rejectStart(error); }
    }
    child.on("error", fail);
    child.on("exit", code => {
      if (!resolved) fail(new Error("Fixture exited before ready: " + code + " " + output.slice(-500)));
    });
    child.stdout.on("data", chunk => {
      output += chunk.toString("utf8");
      const match = /SATURIVO_PORT=(\d+)/.exec(output);
      if (match && !resolved) {
        resolved = true; clearTimeout(timer);
        resolveStart({ child, target: "http://127.0.0.1:" + match[1] + "/health" });
      }
      if (output.length > 10000) output = output.slice(-1000);
    });
  });
}

async function stopFixture(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise(resolveStop => {
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolveStop(); }, 1500);
    child.once("exit", () => { clearTimeout(timer); resolveStop(); });
    child.kill("SIGTERM");
  });
}

async function main() {
  const temp = await mkdtemp(join(tmpdir(), "saturivo-runtime-matrix-"));
  const abort = new AbortController();
  try {
    const goDir = join(root, "test", "fixtures", "go-runtime");
    const goBinary = join(temp, process.platform === "win32" ? "fixture-go.exe" : "fixture-go");
    const built = await runBoundedProcess({
      binary: "go", args: ["build", "-o", goBinary, "."], cwd: goDir,
      signal: abort.signal, timeoutMs: 90000, maxOutputBytes: 12000,
      env: { ...process.env, GOTOOLCHAIN: "local" },
    });
    assert.equal(built.exitCode, 0, built.stderr);
    const fixtures = [
      ["go", goBinary, [], goDir],
      ["node", process.execPath, [join(root, "scripts", "fixtures", "node-server.cjs")], root],
      ["python", process.env.PYTHON || "python3",
        [join(root, "scripts", "fixtures", "python_server.py")], root],
    ];
    for (const [runtime, binary, args, cwd] of fixtures) {
      const { child, target } = await startFixture(binary, args, cwd);
      try {
        const result = await runK6({
          id: "runtime-matrix", name: "HTTP language-neutral contract",
          method: "GET", model: "constant-vus", target,
          durationSeconds: 5, virtualUsers: 2, maxRequests: 2000,
        }, policy, "k6", temp, abort.signal);
        assert(result.metrics.requests >= 100, runtime + ": insufficient real HTTP requests");
        assert(Number.isFinite(result.metrics.p95Ms) && result.metrics.p95Ms > 0,
          runtime + ": missing real P95");
        assert.equal(result.metrics.failedRate, 0, runtime + ": HTTP request failures");
        console.log(runtime + " real HTTP+k6: PASS; requests=" +
          result.metrics.requests + ", P95=" + result.metrics.p95Ms.toFixed(2) + "ms");
      } finally {
        await stopFixture(child);
      }
    }
  } finally {
    abort.abort();
    await rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
