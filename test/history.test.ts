import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HistoryStore } from "../src/core/history";
import type { RunResult } from "../src/core/types";

test("durable history, most recent first, corrupt records ignored", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-test-"));
  try {
    const store = new HistoryStore(dir);
    const run: RunResult = {
      schemaVersion: 1, id: "11111111-1111-4111-8111-111111111111",
      engine: "k6", startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
      scenario: { id: "smoke", name: "Smoke", target: "http://127.0.0.1:8080/",
        method: "GET", model: "constant-vus", virtualUsers: 1, durationSeconds: 10 },
      metrics: { requests: 100, requestsPerSecond: 10, failedRate: 0,
        avgMs: 2, p50Ms: 2, p95Ms: 3, p99Ms: 4, droppedIterations: 0 },
      environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
      warnings: [],
    };
    await store.save(run);
    await store.save({ ...run, id: "22222222-2222-4222-8222-222222222222",
      startedAt: "2026-11-07T11:00:00Z" });
    await mkdir(join(dir, "runs"), { recursive: true });
    await writeFile(join(dir, "runs", "20261107120000-broken.json"), "{invalid", "utf8");
    const values = await store.list();
    assert.equal(values.length, 2);
    assert.equal(values[0]?.id, "22222222-2222-4222-8222-222222222222");
    assert.equal(values[1]?.id, run.id);
    assert.equal(await store.prune(1), 2);
    assert.equal((await store.list()).length, 1);
    assert.equal(await store.clear(), 1);
    assert.deepEqual(await store.list(), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
