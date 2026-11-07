"use strict";
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { runK6 } = require("../out/src/core/k6.js");

async function listen(server) {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  assert(addr && typeof addr !== "string");
  return "http://127.0.0.1:" + addr.port;
}
async function close(server) {
  if (!server.listening) return;
  await new Promise((resolve, reject) =>
    server.close(error => error ? reject(error) : resolve()));
}

/**
 * Real k6 redirection/proxy fixture: only disposable loopback sockets are used.
 * If the engine follows a 302 or respects inherited HTTP_PROXY, the trap
 * receives requests and the test fails. This is not a remote rebinding audit.
 */
async function main() {
  const temp = await mkdtemp(join(tmpdir(), "saturivo-proxy-redirect-"));
  let sourceHits = 0, trapHits = 0;
  const trap = createServer((_req, res) => {
    trapHits++;
    res.writeHead(200).end("UNEXPECTED TRAP HIT");
  });
  let source;
  const oldEnv = Object.fromEntries(
    ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
      "http_proxy", "https_proxy", "all_proxy", "no_proxy"]
      .map(key => [key, process.env[key]]));
  try {
    const trapOrigin = await listen(trap);
    source = createServer((_req, res) => {
      sourceHits++;
      res.writeHead(302, { Location: trapOrigin + "/metadata" }).end();
    });
    const origin = await listen(source);
    // A malicious workspace or inherited shell can supply proxy environment
    // variables. runK6 must pass an explicit allowlisted process environment.
    for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY",
      "http_proxy", "https_proxy", "all_proxy"]) process.env[key] = trapOrigin;
    process.env.NO_PROXY = "";
    process.env.no_proxy = "";
    const scenario = {
      id: "redirect-proxy-guard", name: "Loopback redirected destination",
      target: origin + "/redirect", method: "GET", model: "constant-vus",
      durationSeconds: 5, virtualUsers: 1, maxRequests: 2500,
    };
    const result = await runK6(scenario, {
      allowRemoteTargets: false, maxVirtualUsers: 2, maxRequests: 2500,
    }, "k6", temp, new AbortController().signal);
    assert(sourceHits > 0, "Engine must reach the explicitly authorized HTTP origin");
    assert.equal(trapHits, 0, "k6 must neither follow redirect nor inherit HTTP_PROXY");
    assert(result.metrics.requests > 0 && result.metrics.requests <= 2500);
    assert(result.metrics.statusDistribution?.["3xx"] > 0,
      "Recorded HTTP status distribution must expose the 302 responses");
    console.log("Saturivo real k6 proxy/redirect trap: PASS", {
      authorizedHits: sourceHits, unexpectedHits: trapHits,
      observed3xx: result.metrics.statusDistribution["3xx"],
    });
  } finally {
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await Promise.all([close(source), close(trap)]);
    await rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
