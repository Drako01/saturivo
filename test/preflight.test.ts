import { test } from "node:test";
import { strict as assert } from "node:assert";
import { tmpdir } from "node:os";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { checkLocalToolchain, probeLocalBinary } from "../src/core/preflight";

test("setup diagnosis reads a binary version without generating traffic", async () => {
  const result = await probeLocalBinary(process.execPath, ["--version"], tmpdir(),
    new AbortController().signal);
  assert.equal(result.available, true);
  assert.match(result.version ?? "", /^v[0-9]+/);
});
test("absent k6 is reported gracefully and Go remains optional", async () => {
  const dir = await mkdtemp(join(tmpdir(), "saturivo-setup-"));
  try {
    const result = await checkLocalToolchain("__saturivo_missing__", dir,
      new AbortController().signal);
    assert.equal(result.k6.available, false);
    assert.equal(typeof result.go.available, "boolean");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("pre-aborted diagnosis never starts a child process", async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(probeLocalBinary(process.execPath, ["--version"], tmpdir(),
    controller.signal), /Cancelled/);
});
