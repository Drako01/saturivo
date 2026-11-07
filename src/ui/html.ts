import { randomBytes } from "node:crypto";
import type { RunResult } from "../core/types";
import { translate } from "./localize";

export interface DashboardState {
  readonly target: string;
  readonly busy: boolean;
  readonly latest?: RunResult;
  readonly history: readonly RunResult[];
  readonly message: string;
  readonly allowRemoteTargets?: boolean;
  readonly durationSeconds?: number;
  readonly maxVirtualUsers?: number;
  readonly maxRequests?: number;
  readonly sloMaxP95Ms?: number;
}
const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const numeric = (n: number | undefined, decimals = 2): string =>
  n !== undefined && Number.isFinite(n) ? n.toFixed(decimals) : "—";
const count = (n: number | undefined): string =>
  n !== undefined && Number.isFinite(n) ? new Intl.NumberFormat("en-US").format(n) : "—";
function dateLabel(raw: string, locale: string): string {
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale.startsWith("es") ? "es-AR" : "en-US", {
    dateStyle: "medium", timeStyle: "short",
  }).format(date);
}

/** Chart is labeled observational evidence, not a claim of statistical significance. */
function trend(runs: readonly RunResult[], t: (key: string) => string, locale: string): string {
  const data = runs.slice(0, 12).reverse().filter(x => Number.isFinite(x.metrics.p95Ms));
  if (!data.length) return '<div class="empty">' + t("noChartData") + '</div>';
  const ceiling = Math.max(1, ...data.map(x => x.metrics.p95Ms));
  const positions = data.map((run, i) => ({
    x: data.length === 1 ? 300 : 30 + (540 * i / (data.length - 1)),
    y: 160 - (Math.max(0, run.metrics.p95Ms) / ceiling) * 128,
    run,
  }));
  return '<svg class="plot" viewBox="0 0 600 190" role="img" aria-label="' + t("chartA11y") + '">' +
    '<path class="gridline" d="M30 32H570 M30 96H570 M30 160H570"/>' +
    '<polyline class="series" points="' + positions.map(p => p.x + ',' + p.y).join(' ') + '"/>' +
    positions.map(p => '<circle class="point" cx="' + p.x + '" cy="' + p.y +
      '" r="4.5"><title>' + escapeHtml(dateLabel(p.run.startedAt, locale)) + ': ' +
      numeric(p.run.metrics.p95Ms) + ' ms</title></circle>').join('') +
    '</svg><div class="axis"><span>0 ms</span><span>' + t("observedPeak") + ': ' +
    numeric(ceiling) + ' ms</span></div>';
}

/** No network assets, no telemetry, CSP with per-render nonce. All actions use VS Code commands. */
export function dashboard(state: DashboardState, locale: string): string {
  const t = (key: string): string => escapeHtml(translate(locale, key));
  const nonce = randomBytes(16).toString("hex");
  const metric = state.latest?.metrics;
  const busy = state.busy;
  const button = (action: string, label: string, kind: "primary"|"secondary"|"danger" = "secondary", disabled = false): string =>
    '<button type="button" class="button button-' + kind + '" data-action="' + action + '"' +
    (disabled ? ' disabled' : '') + '>' + t(label) + '</button>';
  const tab = (key: string, initial: boolean): string =>
    '<button type="button" role="tab" id="tab-' + key + '" aria-controls="view-' + key +
    '" aria-selected="' + initial + '" tabindex="' + (initial ? 0 : -1) +
    '" data-tab="' + key + '">' + t('tab_' + key) + '</button>';

  const cards = ([
    ['p95', metric ? numeric(metric.p95Ms) + ' ms' : '—', 'cardLatency'],
    ['rps', metric ? numeric(metric.requestsPerSecond) : '—', 'cardRps'],
    ['errors', metric ? numeric(metric.failedRate * 100) + '%' : '—', 'cardErrors'],
    ['requests', count(metric?.requests), 'cardRequests'],
  ] as const).map(([label, value, detail]) =>
    '<article class="metric"><div class="metric-label">' + t(label) + '</div>' +
    '<strong class="metric-value">' + escapeHtml(value) + '</strong>' +
    '<span class="metric-detail">' + t(detail) + '</span></article>').join('');

  const historyRows = state.history.slice(0, 30).map(run => {
    const status = run.sloAssessment?.status ?? 'not-configured';
    const safeStatus = ['pass', 'fail', 'inconclusive', 'not-configured'].includes(status) ? status : 'unknown';
    return '<tr><td><strong>' + escapeHtml(run.scenario.name) + '</strong><small>' +
      escapeHtml(dateLabel(run.startedAt, locale)) + '</small></td><td>' +
      escapeHtml(run.scenario.model) + '</td><td class="num">' +
      numeric(run.metrics.p95Ms) + ' ms</td><td class="num">' + numeric(run.metrics.requestsPerSecond) +
      '</td><td><span class="status status-' + safeStatus + '">' +
      t('status_' + safeStatus) + '</span></td></tr>';
  }).join('');
  const historyTable = historyRows
    ? '<div class="table-wrap"><table><caption class="sr-only">' + t('history') +
      '</caption><thead><tr><th scope="col">' + t('scenario') +
      '</th><th scope="col">' + t('model') + '</th><th scope="col" class="num">' +
      t('p95') + '</th><th scope="col" class="num">' + t('rps') +
      '</th><th scope="col">' + t('slo') +
      '</th></tr></thead><tbody>' + historyRows + '</tbody></table></div>'
    : '<div class="empty">' + t('emptyHistory') + '</div>';

  const scenarios = ([
    ['runSmoke', 'smokeTitle', 'smoke', 'scenarioClosed'],
    ['runStress', 'stressTitle', 'stress', 'scenarioClosed'],
    ['runArrival', 'arrivalTitle', 'arrival', 'scenarioOpen'],
    ['runRamp', 'rampTitle', 'ramp', 'scenarioRamp'],
  ] as const).map(([action, title, detail, tag], i) =>
    '<article class="preset"><div class="preset-index"><span>0' + (i + 1) +
    '</span><span>' + t(tag) + '</span></div><h3>' + t(title) +
    '</h3><p>' + t(detail) + '</p><div class="preset-action">' +
    button(action, 'execute', 'primary', busy) + '</div></article>').join('');

  const editField = (name: string, label: string, value: number, min: number, max: number): string =>
    '<label class="editor-field"><span>' + t(label) + '</span><input type="number" inputmode="numeric" name="' +
    name + '" required min="' + min + '" max="' + max + '" step="1" value="' + value + '"></label>';
  const customEditor = '<article class="panel custom-editor"><div class="panel-heading"><div><h3>' +
    t('customScenarioTitle') + '</h3><p>' + t('customScenarioDescription') +
    '</p></div><span class="small-badge">v2</span></div>' +
    '<form id="custom-scenario" class="custom-form"><div class="editor-fields">' +
    '<label class="editor-field editor-wide"><span>' + t('customName') +
    '</span><input type="text" name="name" maxlength="80" required value="Custom local load"></label>' +
    '<label class="editor-field"><span>' + t('model') +
    '</span><select name="model"><option value="constant-vus">' + t('scenarioClosed') +
    '</option><option value="constant-arrival-rate">' + t('scenarioOpen') +
    '</option><option value="ramping-vus">' + t('scenarioRamp') + '</option></select></label>' +
    '<label class="editor-field"><span>' + t('customMethod') +
    '</span><select name="method"><option>GET</option><option>HEAD</option></select></label>' +
    editField('durationSeconds', 'duration', state.durationSeconds ?? 10, 5, 120) +
    editField('virtualUsers', 'customVus', Math.min(5, state.maxVirtualUsers ?? 100), 1, state.maxVirtualUsers ?? 100) +
    editField('arrivalRate', 'customArrival', 10, 1, 500) +
    '<label class="editor-field editor-wide"><span>' + t('customRampStages') +
    '</span><input type="text" name="stages" maxlength="160" required ' +
    'value="5:2,5:0" aria-describedby="ramp-hint"><span id="ramp-hint">' +
    t('customRampHelp') + '</span></label>' +
    editField('maxRequests', 'maxRequests', state.maxRequests ?? 10000, 100, state.maxRequests ?? 10000) +
    editField('maxP95Ms', 'customP95', state.sloMaxP95Ms ?? 0, 0, 120000) +
    '</div><p class="fineprint">' + t('customTargetNote') + ' ' +
    '<code>' + escapeHtml(state.target) + '</code></p>' +
    '<div class="action-row"><button class="button button-primary" type="submit"' +
    (busy ? ' disabled' : '') + '>' + t('customRun') + '</button>' +
    button('configureTarget', 'configure', 'secondary', busy) + '</div></form></article>';

  const overview = '<section role="tabpanel" id="view-overview" data-view="overview" aria-labelledby="tab-overview">' +
    '<div class="hero"><div><span class="eyebrow green">' + t('workspaceHeading') +
    '</span><h2>' + t('heroTitle') + '</h2><p>' + t('heroDescription') +
    '</p><div class="action-row">' + button('runSmoke', 'quickStart', 'primary', busy) +
    button('configureTarget', 'configure', 'secondary', busy) +
    '</div></div><div class="endpoint"><span class="eyebrow">' + t('target') +
    '</span><code>' + escapeHtml(state.target) + '</code><span class="endpoint-hint">' +
    t(state.allowRemoteTargets ? 'remoteAllowed' : 'loopbackDefault') +
    '</span></div></div>' +
    '<div class="section-title"><div><span class="eyebrow">' + t('observability') +
    '</span><h2>' + t('last') + '</h2></div><span class="subtle">' +
    (state.latest ? escapeHtml(dateLabel(state.latest.startedAt, locale)) : t('noRunYet')) +
    '</span></div><div class="metrics">' + cards + '</div>' +
    '<div class="columns"><article class="panel chart-panel"><div class="panel-heading"><div><h3>' +
    t('latencyTrend') + '</h3><p>' + t('chartDescription') +
    '</p></div><span class="small-badge">' + t('recentObservations') + '</span></div>' +
    trend(state.history, t, locale) +
    '</article><article class="panel summary"><h3>' + t('runSummary') +
    '</h3><div class="line"><span>' + t('slo') + '</span><strong>' +
    t('status_' + (state.latest?.sloAssessment?.status ?? 'not-configured')) +
    '</strong></div><div class="line"><span>' + t('model') + '</span><strong>' +
    (state.latest ? escapeHtml(state.latest.scenario.model) : '—') +
    '</strong></div><div class="line"><span>' + t('p99') + '</span><strong>' +
    (metric ? numeric(metric.p99Ms) + ' ms' : '—') +
    '</strong></div><div class="line"><span>' + t('dropped') + '</span><strong>' +
    count(metric?.droppedIterations) + '</strong></div><div class="bottom-action">' +
    button('compare', 'compare', 'secondary', busy || state.history.length < 2) +
    '</div></article></div></section>';

  const load = '<section role="tabpanel" id="view-load" data-view="load" aria-labelledby="tab-load" hidden>' +
    '<div class="section-title"><div><span class="eyebrow">' + t('workloads') +
    '</span><h2>' + t('loadTitle') + '</h2><p>' + t('loadIntro') +
    '</p></div></div><div class="presets">' + scenarios +
    '</div>' + customEditor +
    '<article class="panel protocol"><div class="panel-heading"><div><h3>' +
    t('websocketTitle') + '</h3><p>' + t('websocketDescription') +
    '</p></div><span class="small-badge">WebSocket</span></div><div class="action-row">' +
    button('websocketProbe', 'websocketRun', 'secondary', busy) +
    '</div></article>' +
    '<div class="columns"><article class="panel"><h3>' + t('executionLimits') +
    '</h3><div class="line"><span>' + t('duration') + '</span><strong>' +
    (state.durationSeconds ?? 10) + ' s</strong></div>' +
    '<div class="line"><span>' + t('maxVus') + '</span><strong>' +
    (state.maxVirtualUsers ?? 100) + '</strong></div>' +
    '<div class="line"><span>' + t('maxRequests') + '</span><strong>' +
    count(state.maxRequests ?? 10000) + '</strong></div>' +
    '<div class="line"><span>' + t('slo') + '</span><strong>' +
    (state.sloMaxP95Ms ? state.sloMaxP95Ms + ' ms' : t('disabled')) +
    '</strong></div><div class="action-row spaced">' +
    button('configureTarget', 'configure', 'secondary', busy) +
    button('configureSlo', 'configureSlo', 'secondary', busy) +
    '</div></article><article class="panel pilot"><span class="eyebrow green">' +
    t('experimental') + '</span><h3>' + t('capacityPilot') +
    '</h3><p>' + t('capacityDescription') + '</p>' +
    button('capacityPilot', 'capacityPilot', 'primary', busy) +
    '<p class="fineprint">' + t('capacityCaution') + '</p></article></div></section>';

  const history = '<section role="tabpanel" id="view-history" data-view="history" aria-labelledby="tab-history" hidden>' +
    '<div class="section-title aligned"><div><span class="eyebrow">' + t('evidence') +
    '</span><h2>' + t('history') + '</h2><p>' + t('historyIntro') +
    '</p></div><div class="action-row">' + button('importJson', 'importJson', 'secondary', busy) +
    button('exportJson', 'exportJson', 'secondary', busy || !state.latest) +
    button('export', 'export', 'secondary', busy || !state.latest) +
    '</div></div><div class="panel table-panel">' + historyTable +
    '</div><div class="history-foot"><p>' + t('historyPrivacy') +
    '</p><div class="action-row">' +
    button('compare', 'compare', 'secondary', busy || state.history.length < 2) +
    button('clearHistory', 'clearHistory', 'danger', busy || !state.history.length) +
    '</div></div></section>';

  const diagTool = (symbol: string, title: string, intro: string, action: string, btn: string,
    secondaryAction?: string, secondaryLabel?: string): string =>
    '<article class="panel diagnostic"><div class="diag-symbol" aria-hidden="true">' + symbol +
    '</div><h3>' + t(title) + '</h3><p>' + t(intro) + '</p><div class="action-row">' +
    button(action, btn, 'primary', busy) +
    (secondaryAction && secondaryLabel ? button(secondaryAction, secondaryLabel, 'secondary', busy) : '') +
    '</div></article>';
  const diagnostics = '<section role="tabpanel" id="view-diagnostics" data-view="diagnostics" aria-labelledby="tab-diagnostics" hidden>' +
    '<div class="section-title"><div><span class="eyebrow">' + t('toolchain') +
    '</span><h2>' + t('diagnosticsTitle') + '</h2><p>' + t('diagnosticsIntro') +
    '</p></div></div><div class="diagnostics">' +
    diagTool('{ }', 'race', 'raceHelp', 'goRace', 'runDetector', 'exportSarif', 'exportSarif') +
    diagTool('◈', 'profile', 'profileHelp', 'captureGoProfile', 'capture', 'clearProfiles', 'clearProfiles') +
    diagTool('↔', 'correlateGo', 'correlateGoHelp', 'correlateGo', 'correlateGoRun') +
    diagTool('↗', 'benchmark', 'benchHelp', 'goBench', 'runBench') +
    '</div><div class="panel safety"><h3>' + t('safetyTitle') +
    '</h3><p>' + t('safety') + ' ' + t('help') + '</p></div></section>';

  const css = [
    ':root{color-scheme:light dark;--bg:var(--vscode-editor-background,#11151b);--fg:var(--vscode-foreground,#e8edf2);--muted:var(--vscode-descriptionForeground,#92a0aa);--border:var(--vscode-panel-border,#303741);--surface:var(--vscode-sideBar-background,#191f27);--accent:#38cbb8;--focus:var(--vscode-focusBorder,#38cbb8);font-family:var(--vscode-font-family,system-ui);font-size:13px}',
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);line-height:1.5}button{font:inherit}button:focus-visible{outline:2px solid var(--focus);outline-offset:2px}[hidden]{display:none!important}',
    '.shell{max-width:1500px;margin:0 auto;padding:0 42px 52px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 0;border-bottom:1px solid var(--border)}.brand{display:flex;gap:14px;align-items:center}.logo{width:46px;height:46px;display:grid;place-items:center;background:rgba(56,203,184,.08);color:var(--accent);border:1px solid rgba(56,203,184,.35);border-radius:13px;font-size:24px;font-weight:800}.eyebrow{color:var(--muted);font-size:10px;font-weight:750;letter-spacing:1.3px;text-transform:uppercase}.green{color:var(--accent)}h1{font-size:22px;letter-spacing:-.6px;margin:2px 0 0;line-height:1.15}.version{font-size:11px;font-weight:500;border:1px solid var(--border);border-radius:40px;padding:3px 8px;color:var(--muted);vertical-align:middle;letter-spacing:0}.state{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:12px}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent)}.dot.active{background:#e9b765}',
    '.tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);overflow:auto;margin-bottom:24px}.tabs button{padding:18px 23px;color:var(--muted);background:none;border:0;position:relative;white-space:nowrap;font-weight:650;cursor:pointer}.tabs button[aria-selected=true]{color:var(--fg)}.tabs button[aria-selected=true]:after{content:"";position:absolute;bottom:0;left:17px;right:17px;height:2px;background:var(--accent)}.tabs button:hover{color:var(--fg)}',
    '.notice{border:1px solid var(--border);border-left:3px solid var(--accent);background:var(--surface);border-radius:7px;padding:11px 14px;color:var(--muted);font-size:12px;margin-bottom:24px}.notice[aria-busy=true]{border-left-color:#e9b765}.notice strong{color:var(--fg)}',
    '.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:28px;align-items:center;background:linear-gradient(108deg,rgba(56,203,184,.10),transparent 68%),var(--surface);border:1px solid rgba(56,203,184,.25);border-radius:14px;padding:34px}.hero h2{font-size:34px;letter-spacing:-1px;line-height:1.14;margin:12px 0}.hero p{color:var(--muted);font-size:14px;max-width:580px;margin:0 0 22px}.endpoint{background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:23px;display:flex;flex-direction:column;gap:12px;min-width:0}.endpoint code{font:13px var(--vscode-editor-font-family,monospace);word-break:break-all}.endpoint-hint{color:var(--muted);font-size:11px}.action-row{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.button{border:1px solid var(--border);border-radius:7px;min-height:35px;white-space:nowrap;padding:8px 14px;cursor:pointer;font-weight:650}.button:disabled{opacity:.42;cursor:not-allowed}.button-primary{background:var(--accent);color:#092823;border-color:var(--accent)}.button-primary:hover:not(:disabled){background:#6adfce}.button-secondary{background:var(--bg);color:var(--fg)}.button-secondary:hover:not(:disabled){border-color:var(--accent)}.button-danger{background:transparent;color:var(--vscode-errorForeground,#e68680);border-color:rgba(230,134,128,.3)}.button-danger:hover:not(:disabled){background:rgba(230,134,128,.10)}',
    '.section-title{display:flex;justify-content:space-between;align-items:flex-end;gap:15px;margin:30px 0 17px}.section-title h2{font-size:21px;margin:3px 0;letter-spacing:-.4px}.section-title p{margin:3px 0;color:var(--muted);font-size:12px}.subtle{color:var(--muted);font-size:12px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.metric{min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:20px}.metric-label{text-transform:uppercase;letter-spacing:1.15px;color:var(--muted);font-size:10px;font-weight:730}.metric-value{display:block;font-size:29px;letter-spacing:-.8px;font-variant-numeric:tabular-nums;margin:10px 0 6px}.metric-detail{color:var(--muted);font-size:11px}',
    '.columns{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(285px,1fr);gap:14px;margin-top:14px}.panel{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:22px;min-width:0}.panel h3{font-size:15px;margin:0 0 15px}.panel p{color:var(--muted);font-size:12px}.panel-heading{display:flex;justify-content:space-between;gap:12px}.panel-heading h3{margin:0}.panel-heading p{margin:5px 0}.small-badge{font-size:10px;color:var(--muted);border:1px solid var(--border);border-radius:20px;padding:4px 9px;white-space:nowrap;align-self:flex-start}.plot{display:block;width:100%;max-height:195px}.gridline{fill:none;stroke:var(--border);stroke-width:1}.series{fill:none;stroke:var(--accent);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.point{fill:var(--surface);stroke:var(--accent);stroke-width:3}.axis{display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}.empty{padding:46px 12px;color:var(--muted);text-align:center}.line{display:flex;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--muted)}.line strong{color:var(--fg);font-variant-numeric:tabular-nums;text-align:right;overflow-wrap:anywhere}.bottom-action{margin-top:19px}',
    '.presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.preset{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:20px;display:flex;flex-direction:column;min-height:246px}.preset-index{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--muted)}.preset-index span:first-child{color:var(--accent);font-weight:800}.preset h3{font-size:18px;margin:25px 0 7px}.preset p{font-size:12px;color:var(--muted);margin:0}.preset-action{margin-top:auto;padding-top:20px}.preset-action .button{width:100%}.spaced{margin-top:21px}.pilot{border-color:rgba(56,203,184,.25)}.fineprint{font-size:11px!important;margin-top:18px!important}',
    '.protocol{margin-top:15px}.protocol .panel-heading{margin-bottom:14px}.custom-editor{margin-top:15px}.custom-editor .panel-heading{margin-bottom:18px}.custom-form{display:flex;flex-direction:column;gap:12px}.editor-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.editor-field{display:flex;flex-direction:column;gap:6px;color:var(--muted);font-size:11px;font-weight:650}.editor-wide{grid-column:span 2}.editor-field input,.editor-field select{width:100%;border:1px solid var(--border);border-radius:7px;background:var(--bg);color:var(--fg);padding:9px 10px;min-height:37px;font:inherit;font-size:12px}.editor-field :is(input,select):focus-visible{outline:2px solid var(--focus);outline-offset:1px}.custom-form code{color:var(--fg);overflow-wrap:anywhere}.custom-form .fineprint{margin:1px 0!important}' ,
    '.table-wrap{overflow-x:auto;width:100%}table{border-collapse:collapse;width:100%;min-width:670px}th{text-align:left;font-size:11px;color:var(--muted);padding:12px 15px;border-bottom:1px solid var(--border)}td{padding:16px 15px;border-bottom:1px solid var(--border);font-size:12px}tr:last-child td{border-bottom:0}td strong{display:block}td small{display:block;color:var(--muted);margin-top:3px}.num{text-align:right;font-variant-numeric:tabular-nums}.status{font-size:11px;border:1px solid var(--border);border-radius:20px;padding:4px 9px}.status-pass{color:var(--accent)}.status-fail{color:var(--vscode-errorForeground,#e68680)}.status-inconclusive{color:#e9b765}.history-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:15px}.history-foot p{font-size:11px;color:var(--muted)}',
    '.diagnostics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.diagnostic{display:flex;flex-direction:column;min-height:260px;align-items:flex-start}.diagnostic .action-row{margin-top:auto}.diagnostic p{font-size:12px}.diag-symbol{display:grid;place-items:center;width:41px;height:41px;border-radius:10px;background:rgba(56,203,184,.09);color:var(--accent);font-weight:800;font-size:19px;margin-bottom:17px}.safety{margin-top:15px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;display:flex;justify-content:space-between;gap:15px}',
    '@media(max-width:1100px){.metrics,.presets,.editor-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.columns,.hero{grid-template-columns:1fr}.diagnostics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:700px){.shell{padding:0 18px 36px}.topbar{flex-wrap:wrap}.hero{padding:24px}.tabs button{padding:14px 12px}.diagnostics{grid-template-columns:1fr}.section-title,.history-foot{align-items:flex-start;flex-direction:column}}@media(max-width:420px){.metrics,.presets,.editor-fields{grid-template-columns:1fr}.editor-wide{grid-column:auto}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}',
  ].join('');
  const script = [
    'const vscode=acquireVsCodeApi();',
    'const tabs=Array.from(document.querySelectorAll("[role=tab][data-tab]"));',
    'function selectTab(name,focus){if(!tabs.some(t=>t.dataset.tab===name))name="overview";',
    'for(const tab of tabs){const active=tab.dataset.tab===name;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}',
    'for(const panel of document.querySelectorAll("[role=tabpanel][data-view]"))panel.hidden=panel.dataset.view!==name;',
    'vscode.setState({...((vscode.getState()||{})),activeTab:name});}',
    'const last=vscode.getState();selectTab(last&&typeof last.activeTab==="string"?last.activeTab:"overview",false);',
    'const custom=document.getElementById("custom-scenario");',
    'if(custom){const stored=vscode.getState();if(stored&&stored.custom){',
    'for(const [key,value] of Object.entries(stored.custom)){const field=custom.elements.namedItem(key);',
    'if((field instanceof HTMLInputElement||field instanceof HTMLSelectElement)&&typeof value==="string")field.value=value;}}',
    'const arrival=custom.elements.namedItem("arrivalRate");',
    'const stages=custom.elements.namedItem("stages");',
    'function toggleModels(){const model=custom.elements.namedItem("model");',
    'const open=model instanceof HTMLSelectElement&&model.value==="constant-arrival-rate";',
    'const ramp=model instanceof HTMLSelectElement&&model.value==="ramping-vus";',
    'if(arrival instanceof HTMLInputElement){arrival.disabled=!open;',
    'const label=arrival.closest("label");if(label)label.hidden=!open;}',
    'if(stages instanceof HTMLInputElement){stages.disabled=!ramp;',
    'const label=stages.closest("label");if(label)label.hidden=!ramp;}}',
    'toggleModels();',
    'function saveCustom(){vscode.setState({...((vscode.getState()||{})),custom:Object.fromEntries(new FormData(custom).entries())});}',
    'custom.addEventListener("input",saveCustom);',
    'custom.addEventListener("change",()=>{toggleModels();saveCustom();});',
    'custom.addEventListener("submit",event=>{event.preventDefault();',
    'const payload=Object.fromEntries(new FormData(custom).entries());saveCustom();',
    'vscode.postMessage({action:"runCustom",payload});});}',
    'document.addEventListener("click",event=>{const elem=event.target;if(!(elem instanceof Element))return;',
    'const nav=elem.closest("button[data-tab]");if(nav){selectTab(nav.dataset.tab,false);return;}',
    'const action=elem.closest("button[data-action]");if(action&&!action.disabled)vscode.postMessage({action:action.dataset.action});});',
    'document.querySelector(".tabs").addEventListener("keydown",event=>{',
    'if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;event.preventDefault();',
    'let index=tabs.findIndex(tab=>tab.getAttribute("aria-selected")==="true");',
    'if(event.key==="Home")index=0;else if(event.key==="End")index=tabs.length-1;',
    'else index=(index+(event.key==="ArrowRight"?1:-1)+tabs.length)%tabs.length;',
    'selectTab(tabs[index].dataset.tab,true);});',
  ].join('\n');

  return [
    '<!doctype html><html lang="' + (locale.toLowerCase().startsWith('es') ? 'es' : 'en') + '">',
    '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'nonce-' + nonce +
      '\'; script-src \'nonce-' + nonce + '\';">',
    '<title>Saturivo Control Center</title><style nonce="' + nonce + '">' + css + '</style></head><body>',
    '<main class="shell"><header class="topbar"><div class="brand"><div class="logo" aria-hidden="true">▂▅▇</div>',
    '<div><div class="eyebrow">ARMOTUSITIO / PERFORMANCE ENGINEERING</div><h1>Saturivo <span class="version">0.1.1</span></h1></div></div>',
    '<div class="state"><span class="dot' + (busy ? ' active' : '') + '" aria-hidden="true"></span><span>' +
      t(busy ? 'running' : 'idle') + '</span>' + (busy ? button('cancel', 'cancel', 'danger') : '') + '</div></header>',
    '<nav class="tabs" role="tablist" aria-label="' + t('navigation') + '">' +
      tab('overview', true) + tab('load', false) + tab('history', false) + tab('diagnostics', false) + '</nav>',
    '<div class="notice" role="status" aria-live="polite" aria-busy="' + busy + '"><strong>' +
      t(busy ? 'running' : 'idleShort') + '</strong> · ' +
      escapeHtml(state.message || t(busy ? 'running' : 'readyMessage')) + '</div>',
    overview, load, history, diagnostics,
    '<footer class="footer"><span>' + t('localFirst') + '</span><span>' + t('footerDisclaimer') + '</span></footer></main>',
    '<script nonce="' + nonce + '">' + script + '</script></body></html>',
  ].join('');
}
