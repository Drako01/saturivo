import { test } from "node:test";
import { strict as assert } from "node:assert";
import { CancelledError, isCancellation, RunLifecycle } from "../src/run-lifecycle";
test("double dispatch during authorization reserves exactly one process slot", async () => {
  const lifecycle = new RunLifecycle();
  let release!: () => void;
  const consent = new Promise<void>(resolve => { release = resolve; });
  let calls = 0;
  let events = 0;
  const first = lifecycle.withBusy(async signal => {
    await consent;
    signal.throwIfAborted();
    calls++;
  }, () => { events++; });
  assert.equal(lifecycle.busy, true);
  assert.equal(await lifecycle.withBusy(async () => { calls++; }), false);
  release();
  assert.equal(await first, true);
  assert.equal(calls, 1);
  assert.equal(lifecycle.busy, false);
  assert.equal(events, 2);
});
test("cancel during a pending modal cannot retain the busy lock", async () => {
  const lifecycle = new RunLifecycle();
  let release!: () => void;
  const consent = new Promise<void>(resolve => { release = resolve; });
  const task = lifecycle.withBusy(async signal => {
    await consent;
    signal.throwIfAborted();
  });
  lifecycle.cancel();
  release();
  await assert.rejects(task, error => error instanceof CancelledError);
  assert.equal(lifecycle.busy, false);
  assert.equal(await lifecycle.withBusy(async () => undefined), true);
});
test("typed cancellation never relies on the message text", () => {
  const abort = new AbortController();
  assert.equal(isCancellation(new Error("Cancelled"), abort.signal), false);
  assert.equal(isCancellation(new CancelledError(), abort.signal), true);
  abort.abort();
  assert.equal(isCancellation(new Error("Other"), abort.signal), true);
});

test("a renderer exception before the first await cannot leak the busy reservation", async () => {
  const lifecycle = new RunLifecycle();
  let invoked = false;
  await assert.rejects(
    lifecycle.withBusy(async () => { invoked = true; }, () => { throw new Error("Render unavailable"); }),
    /Render unavailable/
  );
  assert.equal(invoked, false);
  assert.equal(lifecycle.busy, false);
  assert.equal(await lifecycle.withBusy(async () => undefined), true);
});
