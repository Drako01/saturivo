import { test } from "node:test";
import { strict as assert } from "node:assert";
import { tmpdir } from "node:os";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
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

test("invalid subprocess budgets cannot spawn arbitrary commands", async () => {
  for (const bad of [0, 999, 600001, Number.NaN]) {
    await assert.rejects(runBoundedProcess({
      binary: process.execPath, args: ["-e", "process.exit(3)"],
      cwd: tmpdir(), timeoutMs: bad, maxOutputBytes: 1024,
      signal: new AbortController().signal,
    }), /Invalid subprocess timeout/);
  }
  await assert.rejects(runBoundedProcess({
    binary: process.execPath, args: ["-e", "process.exit(3)"],
    cwd: tmpdir(), timeoutMs: 5000, maxOutputBytes: 1000001,
    signal: new AbortController().signal,
  }), /Invalid output budget/);
});

test("cancelling a subprocess also stops descendants before they can perform delayed work", async () => {
  const folder = await mkdtemp(join(tmpdir(), "saturivo-killtree-"));
  const marker = join(folder, "descendant-survived");
  const controller = new AbortController();
  try {
    const childCode = [
      "const fs=require('node:fs');",
      "setTimeout(()=>{fs.writeFileSync(process.argv[1],'survived')},1200);",
    ].join("");
    const parentCode = [
      "const {spawn}=require('node:child_process');",
      "spawn(process.execPath,['-e',", JSON.stringify(childCode), ",process.argv[1]],{stdio:'ignore'});",
      "setInterval(()=>{},1000);",
    ].join("");
    const running = runBoundedProcess({
      binary: process.execPath, args: ["-e", parentCode, marker],
      cwd: folder, timeoutMs: 5000, maxOutputBytes: 1024, signal: controller.signal,
    });
    await new Promise(resolve => setTimeout(resolve, 300));
    controller.abort();
    await assert.rejects(running, /Cancelled/);
    await new Promise(resolve => setTimeout(resolve, 1400));
    await assert.rejects(readFile(marker, "utf8"), { code: "ENOENT" },
      "A descendant must not survive cancellation to perform delayed filesystem writes");
  } finally { controller.abort(); await rm(folder, { recursive: true, force: true }); }
});
