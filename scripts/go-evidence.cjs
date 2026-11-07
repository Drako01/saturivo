"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { runBoundedProcess } = require("../out/src/core/process.js");
const { parseGoRaceOutput } = require("../out/src/core/race.js");
const { captureGoProfile } = require("../out/src/core/go-profiler.js");
const { summarizeGoPprof, analyzeGoroutineStacks } = require("../out/src/core/go-profile-analysis.js");
const root = path.resolve(__dirname, "..");

async function main() {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "saturivo-go-evidence-"));
  const signal = new AbortController().signal;
  let server;
  try {
    const raceFolder = path.join(root, "test", "fixtures", "go-race");
    const race = await runBoundedProcess({
      binary: "go", args: ["test", "-race", "-count=1", "./..."],
      cwd: raceFolder, signal, timeoutMs: 90_000,
      maxOutputBytes: 150_000, env: { ...process.env, GOTOOLCHAIN: "local" },
    });
    assert.notEqual(race.exitCode, 0, "Synthetic race fixture must fail -race");
    const findings = parseGoRaceOutput(race.stdout + race.stderr, raceFolder);
    assert(findings.length >= 1, "Must link a real Go race to source lines");
    console.log("Go race source evidence: " + findings.length + " observed accesses");

    const runtimeFolder = path.join(root, "test", "fixtures", "go-runtime");
    const executable = path.join(temp, process.platform === "win32" ? "go-runtime.exe" : "go-runtime");
    const build = await runBoundedProcess({
      binary: "go", args: ["build", "-o", executable, "."],
      cwd: runtimeFolder, signal, timeoutMs: 90_000,
      maxOutputBytes: 20_000, env: { ...process.env, GOTOOLCHAIN: "local" },
    });
    assert.equal(build.exitCode, 0, build.stderr);
    server = spawn(executable, [], { cwd: runtimeFolder, shell: false, windowsHide: true });
    const port = await new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => reject(new Error("Go fixture startup deadline exceeded")), 10000);
      server.stdout.on("data", bytes => {
        output += bytes.toString("utf8");
        const match = /SATURIVO_PORT=(\d+)/.exec(output);
        if (!match) return;
        clearTimeout(timer);
        resolve(Number(match[1]));
      });
      server.on("error", error => { clearTimeout(timer); reject(error); });
      server.on("exit", code => { clearTimeout(timer); reject(new Error("Fixture quit " + code)); });
    });
    const origin = "http://127.0.0.1:" + port + "/";
    const goroutines = await captureGoProfile(origin, "goroutine", temp, signal);
    const stacks = await fs.readFile(goroutines.localPath, "utf8");
    assert.match(stacks, /goroutine \d+ \[/);
    const beforeCount = analyzeGoroutineStacks(stacks).observedStacks;
    const response = await fetch(origin + "grow?count=8");
    assert.equal(response.status, 200, "Fixture must produce bounded goroutine growth");
    await response.arrayBuffer();
    await new Promise(resolve => setTimeout(resolve, 50));
    const afterFile = await captureGoProfile(origin, "goroutine", temp, signal);
    const afterCount = analyzeGoroutineStacks(await fs.readFile(afterFile.localPath, "utf8")).observedStacks;
    assert(afterCount - beforeCount >= 6, "Expected observed goroutine growth after controlled fixture");
    console.log("Go goroutine growth: before=" + beforeCount + " after=" + afterCount +
      " (observation only; no asserted leak root cause)");
    await Promise.all(Array.from({ length: 12 }, async () => {
      const result = await fetch(origin + "contend");
      assert.equal(result.status, 200);
      await result.arrayBuffer();
    }));
    const heap = await captureGoProfile(origin, "heap", temp, signal);
    assert(heap.bytes > 0);
    const top = await summarizeGoPprof(heap.localPath, runtimeFolder, signal);
    assert.match(top, /Showing nodes accounting|File:|Type:/);
    for (const kind of ["mutex", "block", "trace"]) {
      const observed = await captureGoProfile(origin, kind, temp, signal);
      assert(observed.bytes > 0, "Empty real Go " + kind + " output");
      assert(observed.localPath.endsWith(kind === "trace" ? ".trace" : ".pprof"));
    }
    console.log("Go pprof mutex/block + runtime trace integration: PASS");
    console.log("Go pprof real runtime integration: PASS");
  } finally {
    if (server) server.kill();
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
