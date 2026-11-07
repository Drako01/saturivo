import { test } from "node:test";
import { strict as assert } from "node:assert";
import { escapeMarkdownInline } from "../src/core/markdown-safety";
import { markdownReport } from "../src/core/report";
import type { RunResult } from "../src/core/types";

const malicious = "![exfil](https://attacker.invalid/pixel) **bold** [x](javascript:alert(1))";
test("untrusted Markdown is always literal, one line and safe inside tables", () => {
  const encoded = escapeMarkdownInline(malicious + "\n## forged | header");
  assert(!encoded.includes("![exfil]("));
  assert(!encoded.includes("**bold**"));
  assert(!encoded.includes("\n"));
  assert(encoded.includes("\\!\\[exfil\\]\\("));
  assert(encoded.includes("\\|"));
  assert(encoded.includes("\\#\\#"));
  assert.equal(escapeMarkdownInline("<img src=x>"), "&lt;img src=x&gt;");
});
test("load report preserves workload hash and removes executable Markdown syntax", () => {
  const run: RunResult = {
    schemaVersion: 2, id: "11111111-1111-4111-8111-111111111111",
    startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
    engine: "k6", scenario: {
      id: "smoke", name: malicious, target: "http://127.0.0.1:8080/?token=secret",
      method: "GET", model: "constant-vus", durationSeconds: 10, virtualUsers: 1,
    }, metrics: { requests: 150, requestsPerSecond: 15, failedRate: 0,
      avgMs: 8, p50Ms: 5, p95Ms: 15, p99Ms: 20, droppedIterations: 0 },
    environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 4 },
    warnings: [malicious],
  };
  const markdown = markdownReport(run);
  assert(!markdown.includes("![exfil]("));
  assert(!markdown.includes("**bold**"));
  assert(!markdown.includes("token=secret"));
  assert(markdown.includes("\\!\\[exfil\\]\\("));
  assert.match(markdown, /Scenario SHA-256: \`[0-9a-f]{64}\`/);
});
