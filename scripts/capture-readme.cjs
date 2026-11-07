"use strict";
/**
 * README screenshots are headless Chromium captures of the actual production
 * dashboard(state, locale) renderer using clearly labeled synthetic data.
 * They show UI behavior, not measured real-world performance.
 */
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { dashboard } = require("../out/src/ui/html.js");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "media", "screenshots");
const base = Date.parse("2026-11-07T10:00:00Z");
const values = [80, 68, 73, 54, 62, 48, 52, 45, 40, 43, 35, 38];

function syntheticRun(index) {
  const p95 = values[index];
  return {
    schemaVersion: 2, id: "00000000-0000-4000-8000-" + String(index).padStart(12, "0"),
    engine: "k6",
    startedAt: new Date(base + index * 600000).toISOString(),
    endedAt: new Date(base + index * 600000 + 10000).toISOString(),
    scenario: {
      id: "smoke", name: index % 3 === 0 ? "Smoke / local API" : "Bounded test / local API",
      target: "http://127.0.0.1:8080/health", method: "GET",
      model: index % 3 === 0 ? "constant-vus" : "constant-arrival-rate",
      durationSeconds: 10, virtualUsers: 10, maxRequests: 1000,
    },
    metrics: {
      requests: 500 + index * 15, requestsPerSecond: 50 + index * 1.5,
      failedRate: index % 7 === 0 ? 0.001 : 0,
      avgMs: p95 * 0.55, p50Ms: p95 * 0.4,
      p95Ms: p95, p99Ms: p95 * 1.24, droppedIterations: 0,
    },
    environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
    warnings: ["SYNTHETIC DOCUMENTATION FIXTURE - NOT REAL PERFORMANCE EVIDENCE"],
    sloAssessment: { status: "pass", violations: [] },
  };
}
function findBrowser() {
  const candidates = [process.env.CHROME_BIN, "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "google-chrome", "chromium"].filter(Boolean);
  for (const file of candidates) {
    const check = spawnSync(file, ["--version"], { encoding: "utf8", timeout: 10000 });
    if (check.status === 0) return file;
  }
  throw new Error("Headless Chromium or Google Chrome required to capture README screenshots.");
}
function selectScreen(html, tab) {
  const section = /(<section role="tabpanel" id="view-([a-z-]+)"[^>]*?)( hidden)?(>)/g;
  html = html.replace(section, (_whole, start, sectionName) =>
    start.replace(/\s+hidden$/, "") + (sectionName === tab ? "" : " hidden") + ">");
  const tabs = /(<button type="button" role="tab" id="tab-([a-z-]+)"[^>]*?aria-selected=")(true|false)("[^>]*?tabindex=")(-?1|0)(")/g;
  html = html.replace(tabs, (_whole, start, tabName, _old, middle, _index, end) =>
    start + (tabName === tab ? "true" : "false") + middle +
    (tabName === tab ? "0" : "-1") + end);
  // The document is a static snapshot; there is no VS Code host to post messages to.
  html = html.replace(/<script nonce="[a-f0-9]+">[\s\S]*?<\/script>/i, "");
  return html;
}
function main() {
  const chrome = findBrowser();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-screenshots-"));
  try {
    fs.mkdirSync(output, { recursive: true });
    const runs = values.map((_, i) => syntheticRun(i)).reverse();
    const state = {
      target: "http://127.0.0.1:8080/health", busy: false, message: "",
      latest: runs[0], history: runs, allowRemoteTargets: false,
      durationSeconds: 10, maxVirtualUsers: 100, maxRequests: 10000, sloMaxP95Ms: 100,
    };
    for (const tab of ["overview", "load", "history", "diagnostics"]) {
      const document = path.join(temp, tab + ".html");
      const png = path.join(output, "control-center-" + tab + ".png");
      fs.writeFileSync(document, selectScreen(dashboard(state, "en"), tab));
      const args = [
        "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
        "--disable-dev-shm-usage", "--force-device-scale-factor=1",
        "--window-size=1480,960", "--screenshot=" + png, "file://" + document,
      ];
      const result = spawnSync(chrome, args, {
        timeout: 40000, encoding: "utf8", env: { ...process.env, TZ: "UTC", LANG: "en_US.UTF-8" },
      });
      if (result.status !== 0 || !fs.existsSync(png)) {
        throw new Error("Capture failed for " + tab + ": " + String(result.stderr).slice(-800));
      }
      const bytes = fs.statSync(png).size;
      if (bytes < 10000 || bytes > 3000000) throw new Error("Unexpected screenshot size: " + bytes);
      console.log("Captured actual dashboard renderer: " + path.relative(root, png) + " (" + bytes + " bytes)");
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
main();
