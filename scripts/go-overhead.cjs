"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { performance } = require("node:perf_hooks");
const { runBoundedProcess } = require("../out/src/core/process.js");
const { captureGoProfile } = require("../out/src/core/go-profiler.js");

const root = path.resolve(__dirname, "..");
const trials = ["control", "profiled", "profiled", "control", "control", "profiled"];
function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted.length % 2
    ? sorted[Math.floor(sorted.length / 2)]
    : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
}
function percentile(values, fraction) {
  return [...values].sort((a, b) => a - b)[Math.ceil(fraction * values.length) - 1];
}
function variation(values) {
  const middle = median(values);
  return middle === 0 ? null :
    Math.round(10000 * median(values.map(value => Math.abs(value - middle))) / middle) / 100;
}
async function startFixture(binary, cwd) {
  const child = spawn(binary, [], { cwd, shell: false, windowsHide: true });
  let startup = "";
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Fixture startup timed out")), 10000);
    const onData = chunk => {
      startup += chunk.toString("utf8");
      if (startup.length > 2048) {
        clearTimeout(timeout);
        reject(new Error("Unexpected fixture startup output"));
        return;
      }
      const match = /SATURIVO_PORT=(\d+)/.exec(startup);
      if (match) {
        clearTimeout(timeout);
        resolve(Number(match[1]));
      }
    };
    child.stdout.on("data", onData);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => {
      clearTimeout(timeout);
      reject(new Error("Go fixture exited during startup: " + code));
    });
  }).catch(error => { child.kill(); throw error; });
  return { child, origin: "http://127.0.0.1:" + port + "/" };
}
async function windowTrial(origin, profiled, profileDir, signal) {
  // Equal numbers of identical requests, bounded concurrency and no background load.
  const durations = [];
  let next = 0;
  const started = performance.now();
  const worker = async () => {
    while (next < 60) {
      next++;
      const requestStarted = performance.now();
      const response = await fetch(origin + "contend", { signal });
      assert.equal(response.status, 200, "Real Go fixture must return 200");
      await response.arrayBuffer();
      durations.push(performance.now() - requestStarted);
    }
  };
  const load = Promise.all(Array.from({ length: 4 }, () => worker()));
  const observations = [];
  try {
    if (profiled) {
      for (let i = 0; i < 4; i++) {
        const profile = await captureGoProfile(origin, "goroutine", profileDir, signal);
        assert(profile.bytes > 0, "Collected profile must be non-empty");
        observations.push(profile.bytes);
      }
    }
    await load;
  } catch (error) {
    await load.catch(() => undefined);
    throw error;
  }
  const wallMs = performance.now() - started;
  assert.equal(durations.length, 60);
  assert(Number.isFinite(wallMs) && wallMs > 0);
  return {
    mode: profiled ? "profiled" : "control",
    requests: durations.length,
    p95Ms: Number(percentile(durations, 0.95).toFixed(3)),
    throughputRps: Number((durations.length / (wallMs / 1000)).toFixed(3)),
    elapsedMs: Number(wallMs.toFixed(3)),
    capturedProfiles: observations.length,
    capturedBytes: observations.reduce((sum, bytes) => sum + bytes, 0),
  };
}

async function main() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "saturivo-go-overhead-"));
  let fixture;
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 90000);
  try {
    const cwd = path.join(root, "test", "fixtures", "go-runtime");
    const binary = path.join(temp, process.platform === "win32" ? "fixture.exe" : "fixture");
    const build = await runBoundedProcess({
      binary: "go", args: ["build", "-o", binary, "."], cwd,
      signal: controller.signal, timeoutMs: 90000, maxOutputBytes: 20000,
      env: { ...process.env, GOTOOLCHAIN: "local" },
    });
    assert.equal(build.exitCode, 0, build.stderr);
    fixture = await startFixture(binary, cwd);
    // Warm the Go HTTP handler once; exclude this request from all observations.
    const ready = await fetch(fixture.origin + "health", { signal: controller.signal });
    assert.equal(ready.status, 200);
    await ready.arrayBuffer();
    const samples = [];
    for (const mode of trials) {
      if (controller.signal.aborted) throw new Error("Overhead fixture deadline exceeded");
      samples.push(await windowTrial(fixture.origin, mode === "profiled", temp, controller.signal));
    }
    const controls = samples.filter(x => x.mode === "control");
    const profiles = samples.filter(x => x.mode === "profiled");
    assert.equal(controls.length, 3);
    assert.equal(profiles.length, 3);
    assert(profiles.every(x => x.capturedProfiles === 4));
    assert(controls.every(x => x.capturedProfiles === 0));
    const controlP95 = median(controls.map(x => x.p95Ms));
    const profiledP95 = median(profiles.map(x => x.p95Ms));
    const controlRps = median(controls.map(x => x.throughputRps));
    const profiledRps = median(profiles.map(x => x.throughputRps));
    const result = {
      schemaVersion: 1,
      fixture: "real Go /contend, 60 requests x 6 windows, concurrency 4",
      design: "ABBAAB (3 control, 3 profiled); four live goroutine snapshots per profiled window",
      platform: process.platform, arch: process.arch, node: process.version,
      samples,
      measured: {
        controlMedianP95Ms: controlP95,
        profiledMedianP95Ms: profiledP95,
        p95DeltaPercent: Number(((profiledP95 / controlP95 - 1) * 100).toFixed(2)),
        controlMedianRps: controlRps,
        profiledMedianRps: profiledRps,
        throughputDeltaPercent: Number(((profiledRps / controlRps - 1) * 100).toFixed(2)),
        controlP95MadPercent: variation(controls.map(x => x.p95Ms)),
        profiledP95MadPercent: variation(profiles.map(x => x.p95Ms)),
      },
      interpretation: "Descriptive local-fixture overhead only; does not isolate instrumentation from shared CPU/disk noise or establish production causality. An inconclusive difference is not zero overhead.",
    };
    assert(Object.values(result.measured).every(value => value === null || Number.isFinite(value)));
    await fs.mkdir(path.join(root, "reports"), { recursive: true });
    await fs.writeFile(path.join(root, "reports", "go-profile-overhead.json"),
      JSON.stringify(result, null, 2) + "\n", { flag: "w", mode: 0o600 });
    console.log(JSON.stringify(result));
    console.log("Real Go profiling-overhead control experiment: PASS (descriptive, not a performance SLO)");
  } finally {
    clearTimeout(deadline);
    controller.abort();
    fixture?.child.kill();
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
