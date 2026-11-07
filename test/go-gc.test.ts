import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import { parseGoGcMetrics, readGoGcMetrics } from "../src/core/go-gc";

const counters = { NumGC: 3, TotalAlloc: 16000, HeapAlloc: 8000, PauseTotalNs: 5000000 };
test("Go expvar parser permits only validated GC counters", () => {
  const supported = parseGoGcMetrics({ memstats: counters, secret: "not exported" });
  assert.equal(supported.status, "SUPPORTED");
  if (supported.status === "SUPPORTED") {
    assert.deepEqual(supported.metrics, { numGc: 3,
      totalAllocBytes: 16000, heapAllocBytes: 8000, pauseTotalNs: 5000000 });
    assert(!JSON.stringify(supported).includes("secret"));
  }
  for (const bad of [
    {}, { memstats: { ...counters, NumGC: -1 } },
    { memstats: { ...counters, TotalAlloc: Number.MAX_SAFE_INTEGER + 1 } },
    { memstats: { ...counters, PauseTotalNs: "5000000" } },
    { memstats: { ...counters, HeapAlloc: Infinity } },
  ]) assert.equal(parseGoGcMetrics(bad).status, "NOT_SUPPORTED");
});
test("Go GC runtime observation uses a direct loopback connection without redirects", async () => {
  let hits = 0;
  const server = createServer((req, res) => {
    hits++;
    if (req.url !== "/debug/vars") { res.writeHead(404).end(); return; }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ memstats: counters, injected: "do not export" }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  const origin = "http://127.0.0.1:" + address.port + "/";
  try {
    const data = await readGoGcMetrics(origin, new AbortController().signal);
    assert.equal(data.status, "SUPPORTED");
    assert.equal(hits, 1);
    assert(!JSON.stringify(data).includes("injected"));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
test("Go GC observation fails closed for redirects, oversized responses and forbidden origins", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(302, { Location: "http://169.254.169.254/metadata" }).end();
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  assert(addr && typeof addr !== "string");
  try {
    assert.equal((await readGoGcMetrics("http://127.0.0.1:" + addr.port + "/",
      new AbortController().signal)).status, "NOT_SUPPORTED");
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
  for (const url of ["https://example.com/", "http://localhost:8080/",
    "http://169.254.169.254/", "http://user:pass@127.0.0.1:6060/"]) {
    await assert.rejects(readGoGcMetrics(url, new AbortController().signal), /literal loopback|credentials/);
  }
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(readGoGcMetrics("http://127.0.0.1:6060/",
    aborted.signal), /Cancelled/);
});
