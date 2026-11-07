import { test } from "node:test";
import { strict as assert } from "node:assert";
import { dashboard } from "../src/ui/html";
import { translate } from "../src/ui/localize";

test("bilingual strings", () => {
  assert.match(translate("es-AR", "title"), /Centro de Control/);
  assert.match(translate("en", "title"), /Control Center/);
});
test("HTML escapes workspace-controlled values and has CSP", () => {
  const markup = dashboard({
    target: "<img src=x onerror=alert(1)>", busy: false,
    history: [], message: "<script>alert(1)</script>",
  }, "en");
  assert(!markup.includes("<img src=x"));
  assert(!markup.includes("<script>alert(1)"));
  assert.match(markup, /Content-Security-Policy/);
  assert.match(markup, /data-action="runSmoke"/);
  assert.match(markup, /data-action="capacityPilot"/);
});

test("editor dashboard has four ARIA tabs and existing actions remain available", () => {
  const markup = dashboard({
    target: "http://127.0.0.1:8080/", busy: false, message: "",
    history: [], durationSeconds: 10, maxVirtualUsers: 100, maxRequests: 10000,
  }, "es-AR");
  for (const tab of ["overview", "load", "history", "diagnostics"]) {
    assert.match(markup, new RegExp('role="tabpanel" id="view-' + tab + '"'));
    assert.match(markup, new RegExp('role="tab" id="tab-' + tab + '"'));
  }
  for (const action of ["runSmoke", "runStress", "runArrival", "runRamp", "compare",
    "capacityPilot", "clearHistory", "importJson", "exportJson", "goRace", "goBench",
    "captureGoProfile", "clearProfiles", "configureSlo"]) {
    assert.match(markup, new RegExp('data-action="' + action + '"'));
  }
  assert.match(markup, /ArrowRight/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /No se inicia ninguna prueba/);
  assert(!markup.includes("undefined"));
});

test("real evidence renders as an accessible chart, but never injects untrusted HTML", () => {
  const scenario = {
    id: "smoke", name: "<svg/onload=alert(7)>",
    target: "http://127.0.0.1:8080/", method: "GET" as const, model: "constant-vus" as const,
    durationSeconds: 10, virtualUsers: 1,
  };
  const run = {
    schemaVersion: 2 as const, id: "11111111-1111-4111-8111-111111111111", engine: "k6" as const,
    startedAt: "2026-11-07T10:00:00Z", endedAt: "2026-11-07T10:00:10Z",
    scenario, metrics: {requests: 120, requestsPerSecond: 12, failedRate: 0,
      avgMs: 15, p50Ms: 12, p95Ms: 25, p99Ms: 29, droppedIterations: 0},
    environment: {platform: "linux", arch: "x64", node: "v22", cpuCount: 4}, warnings: [],
  };
  const markup = dashboard({target: "<img src=x>", busy: false, message: "<script>BAD</script>",
    history: [run], latest: run}, "en");
  assert.match(markup, /role="img" aria-label="P95/);
  assert.match(markup, /<polyline class="series"/);
  assert.match(markup, /25\.00 ms/);
  assert(!markup.includes("<svg/onload="));
  assert(!markup.includes("<img src=x>"));
  assert(!markup.includes("<script>BAD</script>"));
});

test("busy state shows cancel and disables starting concurrent load", () => {
  const markup = dashboard({target: "http://127.0.0.1:3000/", busy: true,
    history: [], message: "Running"}, "en");
  assert.match(markup, /data-action="runSmoke" disabled/);
  assert.match(markup, /data-action="cancel"/);
  assert.match(markup, /aria-busy="true"/);
});
