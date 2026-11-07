"use strict";
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { runK6 } = require("../out/src/core/k6.js");

async function main() {
  const observed = { requests: 0, other: 0 };
  const server = http.createServer((req, res) => {
    observed.requests++;
    if (req.url !== "/saturivo-fixture" || req.method !== "GET") observed.other++;
    res.setHeader("Content-Type", "application/json");
    res.end('{"ok":true}');
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("Not a TCP listener");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "saturivo-real-k6-"));
  const target = "http://127.0.0.1:" + addr.port + "/saturivo-fixture";
  const policy = { allowRemoteTargets: false, maxVirtualUsers: 10 };
  try {
    assert.equal(observed.requests, 0, "No load may start automatically");
    const base = {
      target, method: "GET", durationSeconds: 10,
      slo: { maxP95Ms: 1000, maxErrorPercent: 1 },
    };
    const scenarios = [
      { ...base, id: "real-smoke", name: "Real smoke", model: "constant-vus", virtualUsers: 1 },
      { ...base, id: "real-arrival", name: "Real arrival", model: "constant-arrival-rate",
        virtualUsers: 10, arrivalRate: 20 },
      { ...base, id: "real-ramp", name: "Real ramp", model: "ramping-vus",
        workloadVersion: 2, virtualUsers: 6, durationSeconds: 20,
        stages: [{ durationSeconds: 5, targetVus: 2 },
          { durationSeconds: 10, targetVus: 6 },
          { durationSeconds: 5, targetVus: 0 }] },
    ];
    for (const scenario of scenarios) {
      const result = await runK6(scenario, policy, "k6", dir, new AbortController().signal);
      assert(result.metrics.requests > 0, "Expected real HTTP requests");
      assert(Number.isFinite(result.metrics.p50Ms));
      assert(Number.isFinite(result.metrics.p95Ms));
      assert(Number.isFinite(result.metrics.p99Ms));
      assert(Number.isFinite(result.metrics.requestsPerSecond));
      assert.equal(result.metrics.failedRate, 0);
      assert(result.metrics.requests <= 10000, "Configured request budget must be enforced");
      const capped = result.metrics.requests >= 10000;
      assert.equal(result.sloAssessment.status, capped ? "inconclusive" : "pass");
      assert.match(result.scenarioHash, /^[0-9a-f]{64}$/);
      assert(result.environment.k6Version.includes("k6"));
      console.log(JSON.stringify({
        model: scenario.model, requests: result.metrics.requests,
        p95: result.metrics.p95Ms, p99: result.metrics.p99Ms,
        rps: result.metrics.requestsPerSecond, dropped: result.metrics.droppedIterations,
        slo: result.sloAssessment.status,
      }));
    }
    assert.equal(observed.other, 0);
    assert(observed.requests > 10);
    console.log("Saturivo real k6 loopback integration: PASS");
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
