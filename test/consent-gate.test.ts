import { test } from "node:test";
import { strict as assert } from "node:assert";
import { confirmWhileActive } from "../src/consent-gate";
import { RunLifecycle } from "../src/run-lifecycle";

test("destructive action is not invoked if the modal is rejected", async () => {
  let mutations = 0;
  const run = new RunLifecycle();
  await run.withBusy(async signal => {
    if (await confirmWhileActive(signal, async () => false)) mutations++;
  });
  assert.equal(mutations, 0);
  assert.equal(run.busy, false);
});

test("cancel while waiting for destructive approval cannot delete history", async () => {
  let release!: (decision: boolean) => void;
  const pending = new Promise<boolean>(resolve => { release = resolve; });
  let mutations = 0;
  const run = new RunLifecycle();
  const job = run.withBusy(async signal => {
    if (await confirmWhileActive(signal, async () => pending)) mutations++;
  });
  assert.equal(run.busy, true);
  run.cancel();
  release(true);
  await job;
  assert.equal(mutations, 0);
  assert.equal(run.busy, false);
});
