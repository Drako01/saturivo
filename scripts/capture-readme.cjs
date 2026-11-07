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
const verifyOnly = process.argv.includes("--verify-only");
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
  throw new Error("Headless Chromium or Google Chrome required for UI verification or screenshots.");
}
function selectScreen(html, tab) {
  const section = /(<section role="tabpanel" id="view-([a-z-]+)"[^>]*?)( hidden)?(>)/g;
  html = html.replace(section, (_whole, start, sectionName) =>
    start.replace(/\s+hidden$/, "") + (sectionName === tab ? "" : " hidden") + ">");
  const tabs = /(<button type="button" role="tab" id="tab-([a-z-]+)"[^>]*?aria-selected=")(true|false)("[^>]*?tabindex=")(-?1|0)(")/g;
  html = html.replace(tabs, (_whole, start, tabName, _old, middle, _index, end) =>
    start + (tabName === tab ? "true" : "false") + middle +
    (tabName === tab ? "0" : "-1") + end);
  // Exercise the real production webview script while replacing only the
  // VS Code bridge. All actions remain inert in the screenshot process.
  // This renders the scenario inspector and accessibility tab state exactly
  // as the extension would; metrics are still explicitly synthetic.
  const match = /<script nonce="([a-f0-9]+)">/.exec(html);
  if (!match) throw new Error("Dashboard renderer omitted the CSP script nonce");
  const bridge = '<script nonce="' + match[1] + '">function acquireVsCodeApi(){return {' +
    'getState(){return window.__saturivoState||{activeTab:' + JSON.stringify(tab) + '}},' +
    'setState(value){window.__saturivoState=value},' +
    'postMessage(value){window.__saturivoSent=window.__saturivoSent||[];window.__saturivoSent.push(value)}}}</script>';
  html = html.replace(match[0], bridge + match[0]);
  return html;
}
function main() {
  const chrome = findBrowser();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-screenshots-"));
  try {
    if (!verifyOnly) fs.mkdirSync(output, { recursive: true });
    const runs = values.map((_, i) => syntheticRun(i)).reverse();
    const state = {
      target: "http://127.0.0.1:8080/health", busy: false, message: "",
      latest: runs[0], history: runs, allowRemoteTargets: false,
      durationSeconds: 10, maxVirtualUsers: 100, maxRequests: 10000, sloMaxP95Ms: 100,
    };
    for (const tab of (verifyOnly ? ["load", "history"] : ["overview", "load", "history", "diagnostics"])) {
      const document = path.join(temp, tab + ".html");
      const png = path.join(output, "control-center-" + tab + ".png");
      fs.writeFileSync(document, selectScreen(dashboard(state, "en"), tab));
      if (tab === "load") {
        const html = fs.readFileSync(document, "utf8");
        const nonce = /<script nonce="([a-f0-9]+)">/.exec(html)?.[1];
        if (!nonce) throw new Error("Interactive webview script is missing its CSP nonce");
        const probe = [
          '(function(){',
          'const form=document.getElementById("custom-scenario");',
          'const field=name=>form.elements.namedItem(name);',
          'field("model").value="ramping-vus";field("durationSeconds").value="20";',
          'field("virtualUsers").value="10";field("stages").value="5:2,10:10,5:0";',
          'form.dispatchEvent(new Event("change",{bubbles:true}));',
          'const valid=document.querySelectorAll("#preview-stage-chart .stage-segment").length===3&&',
          '!form.querySelector("button[type=submit]").disabled;',
          'field("stages").value="5:999,5:0";',
          'form.dispatchEvent(new Event("change",{bubbles:true}));',
          'const invalid=form.querySelector("button[type=submit]").disabled&&',

          'document.getElementById("preview-warning").classList.contains("preview-invalid");',
          'field("stages").value="5:2,10:10,5:0";',
          'field("warmupSeconds").value="12";field("cooldownSeconds").value="12";',
          'form.dispatchEvent(new Event("change",{bubbles:true}));',
          'const phaseInvalid=form.querySelector("button[type=submit]").disabled;',
          'field("warmupSeconds").value="2";field("cooldownSeconds").value="2";',
          'form.dispatchEvent(new Event("change",{bubbles:true}));',
          'const phaseValid=!form.querySelector("button[type=submit]").disabled&&',
          'document.getElementById("preview-phase-summary").textContent.includes("16s");',
          'const tabs=Array.from(document.querySelectorAll("button[role=tab]"));',
          'const loadTab=tabs.find(button=>button.dataset.tab==="load");',
          'const historyTab=tabs.find(button=>button.dataset.tab==="history");',
          'loadTab.focus();',
          'loadTab.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true,cancelable:true}));',
          'const arrow=historyTab.getAttribute("aria-selected")==="true"&&',
          'document.activeElement===historyTab&&document.getElementById("view-load").hidden&&',
          '!document.getElementById("view-history").hidden;',
          'historyTab.dispatchEvent(new KeyboardEvent("keydown",{key:"Home",bubbles:true,cancelable:true}));',
          'const home=tabs[0].getAttribute("aria-selected")==="true"&&document.activeElement===tabs[0];',
          'tabs[0].dispatchEvent(new KeyboardEvent("keydown",{key:"End",bubbles:true,cancelable:true}));',
          'const end=tabs[tabs.length-1].getAttribute("aria-selected")==="true"&&',
          'document.activeElement===tabs[tabs.length-1];',
          'const skip=document.querySelector("a.skip-link");',
          'loadTab.click();field("name").focus();',
          'const focused=window.__saturivoState?.focusAnchor;',
          'const focusSaved=focused?.kind==="field"&&focused.value==="name";',
          'const keyboard=arrow&&home&&end&&!!skip&&',
          'document.getElementById("main-workspace").tabIndex===-1&&',
          'tabs.every(tab=>document.getElementById(tab.getAttribute("aria-controls")).tabIndex===0);',
          'document.documentElement.setAttribute("data-ui-smoke",',
          'valid&&invalid&&phaseInvalid&&phaseValid&&keyboard&&focusSaved?"pass":"fail");',
          '})();',
        ].join("");
        const checked = html.replace("</body>",
          '<script nonce="' + nonce + '">' + probe + '</script></body>');
        const probePath = path.join(temp, "interactive-probe.html");
        fs.writeFileSync(probePath, checked);
        const outcome = spawnSync(chrome, [
          "--headless=new", "--no-sandbox", "--disable-gpu",
          "--disable-dev-shm-usage", "--dump-dom", "file://" + probePath,
        ], { encoding: "utf8", timeout: 40000 });
        if (outcome.status !== 0 || !outcome.stdout.includes('data-ui-smoke="pass"')) {
          throw new Error("Interactive scenario studio browser check failed: " +
            String(outcome.stdout).match(/data-ui-smoke="[^"]*"/)?.[0] +
            " " + String(outcome.stderr).slice(-500));
        }
        console.log("Interactive studio DOM (valid/invalid stages): PASS");
      }
      if (tab === "history") {
        const html = fs.readFileSync(document, "utf8");
        const nonce = /<script nonce="([a-f0-9]+)">/.exec(html)?.[1];
        if (!nonce) throw new Error("History script is missing CSP nonce");
        const probe = [
          'const controls=Array.from(document.querySelectorAll("button[data-inspect-run]"));',
          'let valid=controls.length>1&&document.getElementById("run-detail-0")?.hidden===false;',
          'if(controls[1])controls[1].click();',
          'const selected=controls[1]&&document.getElementById(controls[1].getAttribute("aria-controls"));',
          'valid=valid&&controls[1].getAttribute("aria-expanded")==="true"&&',
          'controls[0].getAttribute("aria-expanded")==="false"&&',
          'document.getElementById("run-detail-0").hidden&&selected&&!selected.hidden&&',
          'document.activeElement===selected.querySelector("h3")&&',
          'window.__saturivoState?.selectedRunId===controls[1].dataset.inspectRun;',
          'const actions=["importJson","exportJson","clearHistory","compare"];',
          'for(const name of actions){const btn=document.querySelector("button[data-action="+name+"]");',
          'if(btn&&!btn.disabled)btn.click();else valid=false;}',
          'valid=valid&&actions.every(name=>window.__saturivoSent?.some(item=>item.action===name));',
          'document.documentElement.setAttribute("data-history-smoke",valid?"pass":"fail");',
        ].join("");
        const checked = html.replace("</body>",
          '<script nonce="' + nonce + '">' + probe + '</script></body>');
        const probePath = path.join(temp, "history-probe.html");
        fs.writeFileSync(probePath, checked);
        const outcome = spawnSync(chrome, [
          "--headless=new", "--no-sandbox", "--disable-gpu",
          "--disable-dev-shm-usage", "--dump-dom", "file://" + probePath,
        ], { encoding: "utf8", timeout: 40000 });
        if (outcome.status !== 0 || !outcome.stdout.includes('data-history-smoke="pass"')) {
          throw new Error("Interactive history inspector browser check failed: " +
            String(outcome.stderr).slice(-900));
        }
        console.log("Interactive history inspector DOM (selection/focus/state): PASS");
      }
      if (verifyOnly) continue; // No screenshot output or repository changes during ordinary CI.
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
    if (verifyOnly) console.log("Control Center browser interaction checks: PASS (no screenshots written)");
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
main();
