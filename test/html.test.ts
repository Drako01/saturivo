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
    "captureGoProfile", "clearProfiles", "configureSlo", "websocketProbe"]) {
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

test("custom scenario editor is accessible, bounded, localized and explicit-action-only", () => {
  const markup = dashboard({
    target: "http://127.0.0.1:9090/health", busy: false, history: [], message: "",
    maxVirtualUsers: 12, maxRequests: 1500, durationSeconds: 25,
  }, "es-AR");
  assert.match(markup, /id="custom-scenario"/);
  assert.match(markup, /name="virtualUsers" required min="1" max="12"/);
  assert.match(markup, /name="maxRequests" required min="100" max="1500"/);
  assert.match(markup, /name="durationSeconds" required min="5" max="120"/);
  assert.match(markup, /action:"runCustom",payload/);
  assert.match(markup, /Editor de escenarios propios/);
  assert.match(markup, /Destino autorizado activo/);
  assert(!markup.includes("onload="));
  const running = dashboard({ target: "http://127.0.0.1/", busy: true,
    history: [], message: "" }, "en");
  assert.match(running, /type="submit" disabled/);
});

test("WebSocket action is explicit and the running state disables protocol probe", () => {
  const idle = dashboard({ target: "http://127.0.0.1:8080/", busy: false,
    history: [], message: "" }, "en");
  assert.match(idle, /data-action="websocketProbe"/);
  assert.match(idle, /WebSocket local probe/);
  const busy = dashboard({ target: "http://127.0.0.1:8080/", busy: true,
    history: [], message: "" }, "es-AR");
  assert.match(busy, /data-action="websocketProbe" disabled/);
});

test("custom ramp editor exposes only selected stage controls and preserves accessible hints", () => {
  const markup = dashboard({ target: "http://127.0.0.1:8080/", busy: false,
    history: [], message: "" }, "es-AR");
  assert.match(markup, /option value="ramping-vus"/);
  assert.match(markup, /name="stages"/);
  assert.match(markup, /aria-describedby="ramp-hint"/);
  assert.match(markup, /toggleModels/);
  assert.match(markup, /Etapas de rampa/);
});

test("runtime process probe requires user action and is disabled during load", () => {
  const idle = dashboard({ target: "http://127.0.0.1:8080/", busy: false,
    history: [], message: "" }, "en");
  assert.match(idle, /data-action="runtimeProbe"/);
  assert.match(idle, /NOT SUPPORTED/);
  const running = dashboard({ target: "http://127.0.0.1:8080/", busy: true,
    history: [], message: "" }, "es-AR");
  assert.match(running, /data-action="runtimeProbe" disabled/);
});

test("accessible trend data and comparison preview use only observed runs", () => {
  const scenario = {
    id: "smoke", name: "Smoke", target: "http://127.0.0.1/",
    method: "GET" as const, model: "constant-vus" as const,
    durationSeconds: 10, virtualUsers: 1,
  };
  const makeRun = (id: string, p95Ms: number, startedAt: string) => ({
    schemaVersion: 2 as const, id, startedAt, endedAt: "2026-11-07T10:01:00Z",
    engine: "k6" as const, scenario,
    metrics: { requests: 200, requestsPerSecond: 20, failedRate: 0,
      avgMs: 10, p50Ms: 8, p95Ms, p99Ms: p95Ms + 5, droppedIterations: 0 },
    environment: {platform: "linux", arch: "x64", node: "v22", cpuCount: 4},
    warnings: [],
  });
  const recent = makeRun("22222222-2222-4222-8222-222222222222", 60, "2026-11-07T10:00:20Z");
  const older = makeRun("11111111-1111-4111-8111-111111111111", 40, "2026-11-07T10:00:00Z");
  const markup = dashboard({ target: "http://127.0.0.1/", busy: false,
    latest: recent, history: [recent, older], message: "" }, "es-AR");
  assert.match(markup, /<details class="chart-data">/);
  assert.match(markup, /<th scope="col">Fecha de ejecución/);
  assert.match(markup, /Vista previa de comparación/);
  assert.match(markup, /50\.00%/);
  assert.match(markup, /no es evidencia estadística/);
  assert(!markup.includes("NaN"));
});

test("professional Control Center includes guided workflow and contextual visual preview", () => {
  const idle = dashboard({ target: "http://127.0.0.1:8080/", busy: false,
    history: [], message: "" }, "es-AR");
  assert.match(idle, /id="workflow-title"/);
  assert.match(idle, /data-tab="load"/);
  assert.match(idle, /De una prueba controlada a evidencia útil/);
  assert.match(idle, /Tu historial de rendimiento comienza acá/);
  assert.match(idle, /class="scenario-workspace"/);
  assert.match(idle, /class="scenario-preview"/);
  assert.match(idle, /id="preview-stage-chart"/);
  assert.match(idle, /role="status" aria-live="polite"/);
  assert.match(idle, /function updatePreview\(\)/);
  assert.match(idle, /chart\.replaceChildren\(\)/);
  assert.match(idle, /segment\.style\.flexGrow/);
  assert.match(idle, /Sin tráfico automático/);
  const english = dashboard({ target: "http://127.0.0.1:8080/", busy: false,
    history: [], message: "" }, "en-US");
  assert.match(english, /From a controlled test to actionable evidence/);
  assert.match(english, /Know what will run/);
  assert.match(english, /Design your first test/);
  assert(!english.includes("undefined"));
});

test("scenario cards personalize the interactive studio without sending automatic load", () => {
  const markup = dashboard({ target: "http://127.0.0.1:8080/", busy: false,
    history: [], message: "" }, "en");
  for (const preset of ["smoke", "stress", "arrival", "ramp"]) {
    assert.match(markup, new RegExp('data-preset="' + preset + '"'));
    assert.match(markup, new RegExp("preset-profile-" + preset));
  }
  assert.match(markup, /Customize in scenario studio/);
  assert.match(markup, /action\.addEventListener\("click"/);
  assert.match(markup, /if\(!preset\)return/);
  assert.match(markup, /selectTab\("load",false\)/);
  assert.match(markup, /preview-invalid/);
  assert.match(markup, /submit\.disabled=invalid/);
});
test("busy state identifies indeterminate progress and blocks unsafe scenario controls", () => {
  const markup = dashboard({ target: "http://127.0.0.1:8080/", busy: true,
    history: [], message: "Test in progress" }, "es-AR");
  assert.match(markup, /class="activity-track" role="progressbar"/);
  assert.match(markup, /no hay porcentaje de avance disponible/);
  assert.match(markup, /data-preset="ramp" disabled/);
  assert.match(markup, /type="submit" disabled/);
});

test("sensitive JSON export disclosure is available in English and Spanish", () => {
  assert.match(translate("en", "exportJsonDisclosure"), /unredacted JSON/);
  assert.match(translate("es-AR", "exportJsonDisclosure"), /JSON sin redactar/);
  assert.match(translate("es-AR", "exportJsonConfirm"), /Exportar JSON/);
});
