import { test } from "node:test";
import { strict as assert } from "node:assert";
import { analyzeGoroutineStacks, goroutineComparison, readGoroutineSnapshot } from "../src/core/go-profile-analysis";
import { mkdtemp, rm, writeFile, symlink, truncate } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
test("classifies observed states without claiming a leak", () => {
  const input = [
    "goroutine 1 [running]:", "main.main()",
    "goroutine 12 [chan receive, 5 minutes]:", "main.work()",
    "goroutine 13 [chan receive]:", "main.work()",
    "goroutine 17 [IO wait]:", "net.(*pollDesc).wait()",
  ].join("\n");
  const result = analyzeGoroutineStacks(input);
  assert.equal(result.observedStacks, 4);
  assert.equal(result.states["chan receive"], 2);
  assert.equal(result.states["IO wait"], 1);
  assert.match(goroutineComparison(result, analyzeGoroutineStacks(input + "\ngoroutine 19 [running]:\n")),
    /not proof of goroutine leakage/);
});

test("Go snapshots reject oversized and symlinked files before reading them", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-stack-limits-"));
  try {
    const profile = join(dir, "stacks.txt");
    await writeFile(profile, "goroutine 1 [running]:\n");
    assert.equal((await readGoroutineSnapshot(profile)).observedStacks, 1);
    await truncate(profile, 4_000_001);
    await assert.rejects(readGoroutineSnapshot(profile), /size limit/);
    const link = join(dir, "untrusted-link.txt");
    await symlink(profile, link);
    await assert.rejects(readGoroutineSnapshot(link), /regular file/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
