import { test } from "node:test";
import { mkdtemp, writeFile, symlink, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { strict as assert } from "node:assert";
import { join, resolve } from "node:path";
import { parseGoRaceOutput, validatedGoRaceSourcePath } from "../src/core/race";
const root = resolve("race-test-fixture");
const log = [
  "==================",
  "WARNING: DATA RACE",
  "Read at 0x00c000014120 by goroutine 7:",
  "  main.increment()",
  "      " + join(root, "src", "counter.go") + ":23 +0x11",
  "Previous write at 0x00c000014120 by goroutine 8:",
  "  main.increment()",
  "      " + join(root, "src", "counter.go") + ":29 +0x19",
  "  testing.tRunner()",
  "      /usr/local/go/src/testing/testing.go:111 +0x8",
  "==================",
  "Found 1 data race(s)",
].join("\n");
test("Go -race parser extracts only workspace-owned, observed lines", () => {
  const findings = parseGoRaceOutput(log, root);
  assert.equal(findings.length, 2);
  assert.equal(findings[0]?.line, 23);
  assert.equal(findings[0]?.access, "read");
  assert.equal(findings[1]?.line, 29);
  assert.equal(findings[1]?.access, "write");
  assert(findings.every(x => x.file.includes("counter.go")));
});
test("ignores logs without race and traversal outside root", () => {
  assert.deepEqual(parseGoRaceOutput("ok package\nPASS", root), []);
  const fake = "WARNING: DATA RACE\n  ../../outside.go:3 +0x1\n==================";
  assert.deepEqual(parseGoRaceOutput(fake, root), []);
});

test("verified Go race navigation resolves true files and rejects symlink escapes", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "saturivo-race-root-"));
  const outside = await mkdtemp(join(tmpdir(), "saturivo-race-outside-"));
  try {
    const owned = join(workspace, "main.go");
    const foreign = join(outside, "hidden.go");
    await writeFile(owned, "package main\n");
    await writeFile(foreign, "package secret\n");
    assert.equal(await validatedGoRaceSourcePath(workspace, owned), await realpath(owned));
    await symlink(foreign, join(workspace, "redirect.go"));
    await assert.rejects(validatedGoRaceSourcePath(workspace, join(workspace, "redirect.go")),
      /outside the original trusted workspace/);
    await assert.rejects(validatedGoRaceSourcePath(workspace, foreign),
      /outside the original trusted workspace/);
    await assert.rejects(validatedGoRaceSourcePath(workspace, join(workspace, "missing.go")), /ENOENT/);
  } finally {
    await rm(workspace, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
