import { test } from "node:test";
import { strict as assert } from "node:assert";
import { tmpdir } from "node:os";
import { runBoundedProcess } from "../src/core/process";

test("bounded subprocess captures stdout and exit status", async () => {
  const result = await runBoundedProcess({
    binary: process.execPath, args: ["-e", "console.log('Saturivo fixture')"],
    cwd: tmpdir(), timeoutMs: 5000, maxOutputBytes: 4096, signal: new AbortController().signal,
  });
  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Saturivo fixture/);
  assert.equal(result.truncated, false);
});
test("bounded subprocess caps output without blocking child", async () => {
  const result = await runBoundedProcess({
    binary: process.execPath, args: ["-e", "process.stdout.write('x'.repeat(50000))"],
    cwd: tmpdir(), timeoutMs: 5000, maxOutputBytes: 1024, signal: new AbortController().signal,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.truncated, true);
  assert(result.stdout.length <= 1024);
});
test("abort terminates a running process", async () => {
  const ctrl = new AbortController();
  const running = runBoundedProcess({
    binary: process.execPath, args: ["-e", "setInterval(()=>{}, 1000)"],
    cwd: tmpdir(), timeoutMs: 10000, maxOutputBytes: 1024, signal: ctrl.signal,
  });
  setTimeout(() => ctrl.abort(), 150);
  await assert.rejects(running, /Cancelled/);
});
test("deadline kills stuck child", async () => {
  await assert.rejects(runBoundedProcess({
    binary: process.execPath, args: ["-e", "setInterval(()=>{}, 1000)"],
    cwd: tmpdir(), timeoutMs: 1100, maxOutputBytes: 1024, signal: new AbortController().signal,
  }), /deadline exceeded/);
});
test("pre-aborted signal starts no process", async () => {
  const ctrl = new AbortController(); ctrl.abort();
  await assert.rejects(runBoundedProcess({
    binary: process.execPath, args: ["-e", "throw new Error('should not execute')"],
    cwd: tmpdir(), timeoutMs: 5000, maxOutputBytes: 1024, signal: ctrl.signal,
  }), /Cancelled/);
});

test("UTF-8 output budget is enforced in bytes, not JavaScript characters", async () => {
  const result = await runBoundedProcess({
    binary: process.execPath,
    args: ["-e", "process.stdout.write('🔥'.repeat(5000))"],
    cwd: tmpdir(), timeoutMs: 5000, maxOutputBytes: 1024,
    signal: new AbortController().signal,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.truncated, true);
  assert(Buffer.byteLength(result.stdout, "utf8") <= 1024);
});
