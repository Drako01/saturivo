import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseProcessStatus, readRuntimeSnapshot } from "../src/core/runtime-adapters";

test("runtime process metrics are extracted with no environment, command line or secrets", () => {
  const fixture = [
    "Name:\tnode", "State:\tS (sleeping)", "VmRSS:\t 2200 kB",
    "Threads:\t9", "Env:\tSENSITIVE=should-not-appear",
  ].join("\n");
  const observed = parseProcessStatus("node", 101, fixture);
  assert.equal(observed.status, "SUPPORTED");
  assert.equal(observed.rssBytes, 2_252_800);
  assert.equal(observed.threads, 9);
  assert.deepEqual(observed.availableArtifacts, []);
  assert(!JSON.stringify(observed).includes("SENSITIVE"));
  assert.equal(parseProcessStatus("java", 101, fixture).status, "NOT_SUPPORTED");
  assert.equal(parseProcessStatus("python", 101, fixture).status, "NOT_SUPPORTED");
  assert.equal(parseProcessStatus("python", 102,
    "Name:\tpython3\nVmRSS:\t2300 kB\nThreads:\t2").status, "SUPPORTED");
  assert.equal(parseProcessStatus("java", 102,
    "Name:\tjava\nVmRSS:\t8000 kB\nThreads:\t6").status, "SUPPORTED");
});

test("unsupported runtime state is explicit; malformed PID and spoofed names fail", async () => {
  for (const pid of [0, -1, 2.5, 99999999]) {
    await assert.rejects(readRuntimeSnapshot("node", pid), /Invalid process ID/);
  }
  assert.equal(parseProcessStatus("node", 123,
    "Name:\tnode-evil\nVmRSS:\t120 kB\nThreads:\t3").status, "NOT_SUPPORTED");
  assert.equal(parseProcessStatus("node", 123,
    "Name:\tnode\nVmRSS:\tbogus\nThreads:\t3").status, "NOT_SUPPORTED");
  assert.throws(() => parseProcessStatus("go" as "node", 55, ""), /Unsupported runtime/);
});

test("local Linux real Node process snapshot is available only on supported host", async () => {
  const outcome = await readRuntimeSnapshot("node", process.pid);
  if (process.platform === "linux") {
    assert.equal(outcome.status, "SUPPORTED");
    assert((outcome.rssBytes ?? 0) > 0);
    assert((outcome.threads ?? 0) >= 1);
    assert.equal((await readRuntimeSnapshot("java", process.pid)).status, "NOT_SUPPORTED");
  } else {
    assert.equal(outcome.status, "NOT_SUPPORTED");
  }
});
