import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HistoryStore, isStoredRun } from "../src/core/history";
import type { RunResult } from "../src/core/types";

const sample: RunResult = {
  schemaVersion: 1, id: "11111111-1111-4111-8111-111111111111",
  engine: "k6", startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
  scenario: { id: "smoke", name: "Smoke", target: "http://127.0.0.1:8080/",
    method: "GET", model: "constant-vus", virtualUsers: 1, durationSeconds: 10 },
  metrics: { requests: 100, requestsPerSecond: 10, failedRate: 0,
    avgMs: 2, p50Ms: 2, p95Ms: 3, p99Ms: 4, droppedIterations: 0 },
  environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
  warnings: [],
};
test("durable history, newest first, corrupt records ignored, explicit deletion", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-test-"));
  try {
    const store = new HistoryStore(dir);
    await store.save(sample);
    await store.save({ ...sample, schemaVersion: 2, id: "22222222-2222-4222-8222-222222222222",
      startedAt: "2026-11-07T11:00:00Z" });
    await mkdir(join(dir, "runs"), { recursive: true });
    await writeFile(join(dir, "runs", "20261107120000-00000000-0000-4000-8000-000000000000.json"), "{invalid");
    const values = await store.list();
    assert.equal(values.length, 2);
    assert.equal(values[0]?.schemaVersion, 2);
    assert.equal(values[1]?.id, sample.id);
    assert.equal(await store.prune(1), 2); // corrupt JSON also pruned
    assert.equal((await store.list()).length, 0); // newest malformed file was retained
    assert.equal(await store.clear(), 1);
    assert.deepEqual(await store.list(), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("legacy reports read; malicious, oversized and invalid metrics rejected", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-untrusted-history-"));
  try {
    const store = new HistoryStore(dir);
    await store.save(sample);
    const directory = join(dir, "runs");
    const file = "20261107130000-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.json";
    await writeFile(join(directory, file), JSON.stringify({
      ...sample, id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      metrics: { ...sample.metrics, p95Ms: "not a metric" },
    }));
    const oversized = "20261107140000-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.json";
    await writeFile(join(directory, oversized), " ".repeat(100_100));
    assert.deepEqual((await store.list()).map(x => x.id), [sample.id]);
    await assert.rejects(store.save({ ...sample, id: "../../escape" }), /Invalid run evidence/);
    assert(!isStoredRun({ ...sample, environment: { ...sample.environment, cpuCount: 0 } }));
    assert(isStoredRun(sample));
    assert(isStoredRun({ ...sample, schemaVersion: 2 }));
    assert.equal((await readdir(directory)).length, 3);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
