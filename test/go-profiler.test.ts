import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createServer, type Server } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { captureGoProfile, localPprofEndpoint } from "../src/core/go-profiler";

test("profiler denies remote, credentials and arbitrary paths", () => {
  for (const url of [
    "https://127.0.0.1:6060/", "http://localhost:6060/", "http://example.com/",
    "http://169.254.169.254/", "http://user:pass@127.0.0.1:6060/",
    "http://127.0.0.1:6060/debug/pprof/", "http://127.0.0.1:6060/?x=1",
  ]) assert.throws(() => localPprofEndpoint(url, "heap"), /loopback|expects/);
  assert.equal(localPprofEndpoint("http://127.0.0.1:6060/", "cpu").pathname, "/debug/pprof/profile");
  assert.equal(localPprofEndpoint("http://127.0.0.1:6060/", "cpu").search, "?seconds=5");
});
async function fixture(
  responder: (req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) => void,
  callback: (base: string) => Promise<void>
): Promise<void> {
  const server: Server = createServer(responder);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    await callback("http://127.0.0.1:" + address.port + "/");
  } finally {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
  }
}
test("captures a bounded Go profile to private local storage", async () => {
  const folder = await mkdtemp(join(tmpdir(), "saturivo-pprof-"));
  try {
    await fixture((req, res) => {
      assert.equal(req.url, "/debug/pprof/goroutine?debug=2");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("goroutine 1 [running]:\nfixture.go:7\n");
    }, async base => {
      const result = await captureGoProfile(base, "goroutine", folder, new AbortController().signal);
      assert.equal(result.kind, "goroutine");
      assert(result.localPath.endsWith(".txt"));
      assert.match(await readFile(result.localPath, "utf8"), /fixture.go:7/);
    });
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test("rejects redirect instead of following it", async () => {
  await fixture((_req, res) => { res.writeHead(302, { Location: "http://example.com/" }); res.end(); },
    async base => {
      await assert.rejects(captureGoProfile(base, "heap", tmpdir(), new AbortController().signal), /HTTP status 302/);
    });
});
test("rejects oversized profiles", async () => {
  await fixture((_req, res) => {
    res.writeHead(200);
    res.end(Buffer.alloc(4_100_000));
  }, async base => {
    await assert.rejects(captureGoProfile(base, "heap", tmpdir(), new AbortController().signal), /exceeds 4 MB/);
  });
});
test("rejects aborted profiler requests", async () => {
  const ctrl = new AbortController(); ctrl.abort();
  await assert.rejects(captureGoProfile("http://127.0.0.1:6060/", "heap", tmpdir(), ctrl.signal), /Cancelled/);
});
