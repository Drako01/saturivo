import { randomBytes } from "node:crypto";
import type { RunResult } from "../core/types";
import { translate } from "./localize";

export interface DashboardState {
  readonly target: string;
  readonly busy: boolean;
  readonly latest?: RunResult;
  readonly history: readonly RunResult[];
  readonly message: string;
}

function html(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function format(value: number): string { return Number.isFinite(value) ? value.toFixed(2) : "—"; }

export function dashboard(state: DashboardState, locale: string): string {
  const t = (key: string): string => html(translate(locale, key));
  const nonce = randomBytes(16).toString("hex");
  const actions = [
    ["configureTarget", "configure", false],
    ["runSmoke", "smoke", state.busy], ["runStress", "stress", state.busy],
    ["runArrival", "arrival", state.busy], ["compare", "compare", state.busy],
    ["export", "export", !state.latest], ["goRace", "race", state.busy],
    ["goBench", "benchmark", state.busy], ["cancel", "cancel", !state.busy],
  ];
  const buttons = actions.map(([action, label, disabled]) =>
    '<button type="button" data-action="' + action + '"' + (disabled ? " disabled" : "") + ">" + t(String(label)) + "</button>").join("");
  const metric = state.latest?.metrics;
  const rows = metric ? [
    ["requests", String(metric.requests)], ["rps", format(metric.requestsPerSecond)],
    ["p95", format(metric.p95Ms)], ["p99", format(metric.p99Ms)],
    ["errors", format(metric.failedRate * 100) + "%"],
  ].map(([label, value]) => "<div class='metric'><span>" + t(String(label)) +
    "</span><strong>" + html(String(value)) + "</strong></div>").join("") : "";
  const history = state.history.length
    ? state.history.slice(0, 8).map(item => "<li><span>" + html(item.scenario.name) +
      "</span><small>" + html(item.startedAt) + " · " + format(item.metrics.p95Ms) +
      " ms P95</small></li>").join("")
    : "<li>" + t("none") + "</li>";
  const css = [
    ":root{color-scheme:dark light;font-family:var(--vscode-font-family)}",
    "body{padding:16px;color:var(--vscode-foreground);background:var(--vscode-sideBar-background)}",
    "h1{font-size:18px;margin:0}p{line-height:1.4}",
    ".muted,small{color:var(--vscode-descriptionForeground)}",
    ".target{word-break:break-all;background:var(--vscode-editor-background);padding:10px;border-radius:6px;margin:12px 0}",
    ".actions{display:grid;grid-template-columns:1fr;gap:7px}",
    "button{padding:9px;cursor:pointer;background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:0;border-radius:5px;text-align:left}",
    "button:disabled{opacity:.45;cursor:not-allowed}button:hover:not(:disabled){background:var(--vscode-button-hoverBackground)}",
    ".panel{border:1px solid var(--vscode-panel-border);border-radius:8px;padding:12px;margin-top:14px}",
    ".metric{display:flex;justify-content:space-between;gap:10px;padding:5px 0}",
    ".metric strong{font-variant-numeric:tabular-nums}",
    "ul{list-style:none;padding:0;margin:0}li{display:flex;flex-direction:column;padding:6px 0;border-bottom:1px solid var(--vscode-panel-border)}",
    ".status{border-left:3px solid var(--vscode-focusBorder);padding-left:10px}",
  ].join("");
  const script = [
    "const vscode = acquireVsCodeApi();",
    "document.querySelectorAll('button[data-action]').forEach(button => {",
    " button.addEventListener('click', () => vscode.postMessage({action: button.dataset.action}));",
    "});",
  ].join("\n");
  return [
    "<!doctype html><html lang='" + (locale.startsWith("es") ? "es" : "en") + "'>",
    "<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<meta http-equiv='Content-Security-Policy' content=\"default-src 'none'; style-src 'nonce-" + nonce +
      "'; script-src 'nonce-" + nonce + "';\">",
    "<style nonce='" + nonce + "'>" + css + "</style></head><body>",
    "<h1>" + t("title") + "</h1><p class='muted'>" + t("subtitle") + "</p>",
    "<div class='target'><small>" + t("target") + "</small><div>" + html(state.target) + "</div></div>",
    "<p class='status'>" + html(state.message || (state.busy ? translate(locale, "running") : translate(locale, "idle"))) + "</p>",
    "<div class='actions'>" + buttons + "</div>",
    "<section class='panel'><h2>" + t("last") + "</h2>" + (rows || t("none")) + "</section>",
    "<section class='panel'><h2>" + t("history") + "</h2><ul>" + history + "</ul></section>",
    "<p class='muted'>" + t("safety") + "</p><small>" + t("help") + "</small>",
    "<script nonce='" + nonce + "'>" + script + "</script></body></html>",
  ].join("");
}
