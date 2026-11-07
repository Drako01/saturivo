"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { runK6 } = require("../out/src/core/k6.js");

function command(binary, args, cwd, timeoutMs = 120_000, extraEnv = {}) {
  const result = spawnSync(binary, args, {
    cwd, shell: false, encoding: "utf8", timeout: timeoutMs,
    env: { ...process.env, ...extraEnv }, maxBuffer: 512_000,
  });
  if (result.error || result.status !== 0) {
    throw new Error(binary + " " + args.slice(0, 3).join(" ") + " failed: " +
      String(result.error || result.stderr || result.stdout).slice(-2000));
  }
  return result.stdout.trim();
}
async function main() {
  if (process.platform !== "linux") throw new Error("Docker Compose fixture requires Linux runner");
  const root = path.resolve(__dirname, "..");
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-compose-e2e-"));
  const compose = path.join(temp, "compose.yaml");
  const project = "saturivo" + process.pid;
  const dockerEnv = { COMPOSE_PROJECT_NAME: project, DOCKER_BUILDKIT: "1" };
  try {
    // FROM scratch and CGO_ENABLED=0: no registry pulls, hidden downloads,
    // application dependencies, or external infrastructure are required.
    fs.copyFileSync(path.join(root, "test/fixtures/compose/main.go"), path.join(temp, "main.go"));
    command("go", ["build", "-trimpath", "-o", "server", "main.go"], temp,
      120_000, { CGO_ENABLED: "0", GOTOOLCHAIN: "local", GOOS: "linux" });
    fs.writeFileSync(path.join(temp, "Dockerfile"),
      'FROM scratch\nCOPY server /server\nUSER 65532:65532\nEXPOSE 8080\nENTRYPOINT ["/server"]\n');
    fs.writeFileSync(compose, [
      "services:", "  target:", "    build:", "      context: .",
      "    ports:", "      - '127.0.0.1::8080'", "",
    ].join("\n"));
    const args = ["compose", "-f", compose];
    command("docker", [...args, "up", "-d", "--build"], temp, 120_000, dockerEnv);
    const mapped = command("docker", [...args, "port", "target", "8080"], temp, 15_000, dockerEnv);
    const match = /(?:127\.0\.0\.1|\[::1\]):(\d+)/.exec(mapped);
    assert(match, "Compose target must publish only a loopback host port: " + mapped);
    const port = Number(match[1]);
    const origin = "http://127.0.0.1:" + port + "/";
    let ready = false;
    for (let attempt = 0; attempt < 80 && !ready; attempt++) {
      try {
        const response = await fetch(origin + "health", { signal: AbortSignal.timeout(1000) });
        ready = response.status === 200 && await response.text() === "ok";
      } catch { /* Container may still be booting. */ }
      if (!ready) await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert(ready, "Docker Compose service did not become healthy on loopback");
    const before = Number(await (await fetch(origin + "requests")).text());
    const policy = { allowRemoteTargets: false, maxVirtualUsers: 4, maxRequests: 1000 };
    const run = await runK6({
      id: "compose-real", name: "Docker Compose loopback fixture", model: "constant-vus",
      method: "GET", target: origin + "health", durationSeconds: 5,
      virtualUsers: 2, maxRequests: 1000,
    }, policy, "k6", temp, new AbortController().signal);
    const after = Number(await (await fetch(origin + "requests")).text());
    assert(run.metrics.requests > 0 && run.metrics.requests <= 1000,
      "Docker Compose k6 evidence must contain bounded real requests");
    assert(Number.isFinite(run.metrics.p95Ms) && run.metrics.p95Ms > 0);
    assert(after > before, "The Compose container must actually receive the workload");
    console.log("Docker Compose FROM scratch -> loopback -> real k6: PASS", {
      requests: run.metrics.requests, p95Ms: run.metrics.p95Ms, hostPort: port,
    });
  } finally {
    if (fs.existsSync(compose)) {
      try {
        command("docker", ["compose", "-f", compose, "down", "--remove-orphans",
          "--volumes", "--rmi", "local"], temp, 40_000, dockerEnv);
      } catch (error) { console.error("Compose cleanup:", error); process.exitCode = 1; }
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
