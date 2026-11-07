import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, writeFile, link, symlink, rm, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBoundedRegularTextFile } from "../src/core/bounded-file";
import { HistoryStore } from "../src/core/history";
import type { RunResult } from "../src/core/types";

const sample: RunResult = {
  schemaVersion: 1, id: "11111111-1111-4111-8111-111111111111", engine: "k6",
  startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
  scenario: { id: "smoke", name: "Smoke", target: "http://127.0.0.1:8080/",
    method: "GET", model: "constant-vus", durationSeconds: 10, virtualUsers: 1 },
  metrics: { requests: 100, requestsPerSecond: 10, failedRate: 0,
    avgMs: 2, p50Ms: 2, p95Ms: 3, p99Ms: 4, droppedIterations: 0 },
  environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
  warnings: [],
};

test("bounded reader enforces byte limit and reads normal UTF-8 file", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-bounded-read-"));
  try {
    const file = join(dir, "plain.txt");
    await writeFile(file, "á🔥");
    assert.equal(await readBoundedRegularTextFile(file, 10), "á🔥");
    await assert.rejects(readBoundedRegularTextFile(file, 5), /size limit/);
    await assert.rejects(readBoundedRegularTextFile(file, 0), /Invalid bounded-file/);
    await truncate(file, 4_000_001);
    await assert.rejects(readBoundedRegularTextFile(file, 4_000_000), /size limit/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("bounded reader refuses symbolic links and hard links to other files", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-link-safety-"));
  try {
    const privateFile = join(dir, "outside.json");
    const symbolic = join(dir, "symbolic.json");
    const hard = join(dir, "hard.json");
    await writeFile(privateFile, JSON.stringify(sample));
    await symlink(privateFile, symbolic);
    await link(privateFile, hard);
    await assert.rejects(readBoundedRegularTextFile(symbolic, 100_000), /regular file/);
    await assert.rejects(readBoundedRegularTextFile(hard, 100_000), /regular file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("historical record hardlinks cannot leak a valid external run into the UI", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-history-link-safety-"));
  try {
    const outside = join(dir, "not-owned.json");
    await writeFile(outside, JSON.stringify(sample));
    await mkdir(join(dir, "runs"));
    await link(outside, join(dir, "runs",
      "20261107100000-" + sample.id + ".json"));
    const store = new HistoryStore(dir);
    assert.deepEqual(await store.list(), []);
    await store.save({ ...sample, id: "22222222-2222-4222-8222-222222222222",
      startedAt: "2026-11-07T11:00:00Z", endedAt: "2026-11-07T11:00:10Z" });
    assert.equal((await store.list()).length, 1,
      "Normal extension-owned records remain readable");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
