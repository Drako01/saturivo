"use strict";
const assert = require("node:assert/strict");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs/promises");
const { runK6 } = require("../out/src/core/k6.js");
const { compareTrialGroups } = require("../out/src/core/statistics.js");

async function main() {
  let delayMs = 10, remoteRequests = 0;
  const server = http.createServer((req, res) => {
    remoteRequests++;
    if (req.url !== "/benchmark" || req.method !== "GET") {
      res.writeHead(404);
      res.end();
      return;
    }
    setTimeout(() => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"fixture":"saturivo"}');
    }, delayMs);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected local TCP fixture");
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "saturivo-regression-"));
  const scenario = {
    id: "statistical-regression", name: "Local repeated-trial benchmark",
    target: "http://127.0.0.1:" + address.port + "/benchmark",
    method: "GET", model: "constant-arrival-rate",
    durationSeconds: 10, virtualUsers: 10, arrivalRate: 20,
    maxRequests: 500,
  };
  const policy = { allowRemoteTargets: false, maxVirtualUsers: 10, maxRequests: 500 };
  const repetitions = async (count) => {
    const runs = [];
    for (let index = 0; index < count; index++) {
      const evidence = await runK6(scenario, policy, "k6", temporary, new AbortController().signal);
      assert(evidence.metrics.requests >= 100, "A real trial needs at least 100 responses");
      assert.equal(evidence.metrics.droppedIterations, 0, "Load generator must sustain requested rate");
      assert.equal(evidence.metrics.failedRate, 0, "Only healthy responses count");
      assert(evidence.metrics.requests <= 500, "No trial may exceed its request budget");
      runs.push(evidence);
    }
    return runs;
  };
  try {
    assert.equal(remoteRequests, 0, "No HTTP requests before explicit test invocation");
    const baseline = await repetitions(3);
    const control = await repetitions(3);
    const controlVerdict = compareTrialGroups(baseline, control);
    assert.notEqual(controlVerdict.status, "regression",
      "Identical healthy fixtures must not produce a false regression");
    delayMs = 120; // Inject a measured server regression without changing workload or test environment.
    const candidate = await repetitions(3);
    const verdict = compareTrialGroups(baseline, candidate);
    assert.equal(verdict.status, "regression", JSON.stringify(verdict));
    assert(verdict.ciLowerPercent > 10);
    assert(verdict.baselineRuns === 3 && verdict.candidateRuns === 3);
    console.log(JSON.stringify({
      baselineP95Ms: baseline.map(x => x.metrics.p95Ms),
      controlP95Ms: control.map(x => x.metrics.p95Ms),
      regressedP95Ms: candidate.map(x => x.metrics.p95Ms),
      controlVerdict: controlVerdict.status,
      injectedRegression: verdict,
      totalLocalRequests: remoteRequests,
      caveat: "Fixture evidence only; not proof of production capacity.",
    }));
    console.log("Saturivo real statistical regression fixture: PASS");
  } finally {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(temporary, { recursive: true, force: true });
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
