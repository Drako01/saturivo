import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureGoLoadTimeline, goCorrelationMarkdown, type TimelinePhase } from "../src/core/go-correlation";
import type { RunResult } from "../src/core/types";
const fixture: RunResult = {
  schemaVersion: 2, id: "11111111-1111-4111-8111-111111111111", engine: "k6",
  startedAt: "2026-11-07T09:00:00Z", endedAt: "2026-11-07T09:00:10Z",
  scenario: {id:"smoke",name:"Smoke",model:"constant-vus",method:"GET",
    target:"http://127.0.0.1:8080/",durationSeconds:10,virtualUsers:1},
  metrics: {requests:150,requestsPerSecond:15,failedRate:0,avgMs:12,
    p50Ms:11,p95Ms:21,p99Ms:24,droppedIterations:0},
  environment: {platform:"linux",arch:"x64",node:"v22",cpuCount:4},warnings:[],
};
test("three independent goroutine snapshots correlate with a completed load, not causality", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-timeline-"));
  try {
    const sequence: string[] = [];
    const point = async (phase: TimelinePhase) => {
      sequence.push(phase);
      const file = join(dir, phase + ".txt");
      const n = phase === "before" ? 2 : phase === "during" ? 6 : 3;
      await writeFile(file, Array.from({ length: n }, (_, i) =>
        "goroutine " + (i + 1) + " [running]:\n").join("\n"));
      return {kind:"goroutine" as const,localPath:file,bytes:200,capturedAt:"2026-11-07T09:00:00Z"};
    };
    const result = await captureGoLoadTimeline(
      async phase => point(phase),
      async () => { sequence.push("execute"); return fixture; }, new AbortController().signal
    );
    assert.deepEqual(sequence, ["before", "execute", "during", "after"]);
    assert.deepEqual(result.points.map(p=>p.snapshot.observedStacks), [2,6,3]);
    assert.equal(result.observedDelta, 1);
    assert.match(goCorrelationMarkdown(result), /not establish causation/);
    assert(!goCorrelationMarkdown(result).includes(dir));
    const injected = { ...result, run: { ...result.run, scenario: {
      ...result.run.scenario, name: "safe\n## injected header" } } };
    assert(!goCorrelationMarkdown(injected).includes("\n## injected header"));
  } finally {await rm(dir,{recursive:true,force:true});}
});
test("aborted timeline starts no profiling or load", async () => {
  const ctrl = new AbortController(); ctrl.abort();
  let invoked = false;
  await assert.rejects(captureGoLoadTimeline(async()=>{invoked=true;throw Error("bad");},
    async()=>{invoked=true;return fixture;},ctrl.signal),/Cancelled/);
  assert.equal(invoked,false);
});

test("failed in-flight Go profile aborts its owned load process", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-timeline-abort-"));
  let aborted = false;
  try {
    await assert.rejects(captureGoLoadTimeline(
      async phase => {
        if (phase === "during") throw new Error("Controlled snapshot failure");
        const localPath = join(dir, "before.txt");
        await writeFile(localPath, "goroutine 1 [running]:\n");
        return { kind: "goroutine" as const, localPath, bytes: 24,
          capturedAt: "2026-11-07T09:00:00Z" };
      },
      signal => new Promise<RunResult>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          aborted = true;
          reject(new Error("Cancelled"));
        }, { once: true });
      }),
      new AbortController().signal
    ), /Controlled snapshot failure/);
    assert.equal(aborted, true, "The in-flight load must be cancelled after profiling fails");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
