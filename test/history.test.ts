import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, rm, writeFile, mkdir, readdir, symlink } from "node:fs/promises";
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
      startedAt: "2026-11-07T11:00:00Z", endedAt: "2026-11-07T11:00:10Z" });
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

test("import rejects credential URLs, hostile SLOs, inconsistent stage definitions and malformed evidence", () => {
  assert.equal(isStoredRun(sample), true, "historical v1 report must remain importable");
  for (const value of [
    { ...sample, scenario: { ...sample.scenario, target: "file:///etc/passwd" } },
    { ...sample, scenario: { ...sample.scenario, target: "http://user:pass@localhost/" } },
    { ...sample, scenario: { ...sample.scenario, maxRequests: -1 } },
    { ...sample, scenario: { ...sample.scenario, stages: [{ targetVus: 100, durationSeconds: 10 }] } },
    { ...sample, scenario: { ...sample.scenario, slo: { maxP95Ms: "nan" } } },
    { ...sample, sloAssessment: { status: "pass", violations: "fake" } },
    { ...sample, environment: { ...sample.environment, cpuModel: "<".repeat(10000) } },
    { ...sample, endedAt: "2020-01-01T00:00:00Z" },
    { ...sample, metrics: { ...sample.metrics, failedRate: 2 } },
  ]) assert.equal(isStoredRun(value), false);
});

test("retention is configurable, validated and applied after import", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-retention-"));
  try {
    const store = new HistoryStore(dir, 2);
    assert.throws(() => store.setRetention(1001), /retention/);
    for (let i = 1; i <= 3; i++) {
      await store.save({
        ...sample, id: String(i).padStart(8, "0") + "-1111-4111-8111-111111111111",
        startedAt: "2026-11-07T10:00:" + String(i).padStart(2, "0") + "Z",
      });
    }
    const items = await store.list();
    assert.equal(items.length, 2);
    assert.deepEqual(items.map(x => x.startedAt), [
      "2026-11-07T10:00:03Z", "2026-11-07T10:00:02Z",
    ]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("history never reads files through attacker-created symlinks", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-link-"));
  const outside = await mkdtemp(join(tmpdir(), "saturivo-other-"));
  try {
    const external = join(outside, "confidential.json");
    await writeFile(external, JSON.stringify(sample));
    await mkdir(join(dir, "runs"), { recursive: true });
    const maliciousName = "20261107110000-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.json";
    await symlink(external, join(dir, "runs", maliciousName));
    const store = new HistoryStore(dir);
    assert.deepEqual(await store.list(), []);
    assert.equal(await store.clear(), 0, "Unowned symlink must never be followed or deleted");
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
