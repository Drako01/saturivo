import { randomBytes } from "node:crypto";
import type { RunResult } from "../core/types";
import { fingerprintScenario } from "../core/fingerprint";
import { compareRuns } from "../core/comparison";
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
/** Display-only target; actual validated execution URL remains unchanged. */
function displayTarget(raw: string): string {
  const start = [raw.indexOf("?"), raw.indexOf("#")].filter(index => index >= 0);
  return start.length ? raw.slice(0, Math.min(...start)) + " [query redacted]" : raw;
}

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
    numeric(ceiling) + ' ms</span></div>' +
    '<details class="chart-data"><summary>' + t("chartDataTable") + '</summary>' +
    '<div class="table-wrap"><table><thead><tr><th scope="col">' + t("chartRunDate") +
    '</th><th scope="col">' + t("p95") + '</th></tr></thead><tbody>' +
    data.map(run => '<tr><td>' + escapeHtml(dateLabel(run.startedAt, locale)) +
      '</td><td class="num">' + numeric(run.metrics.p95Ms) + ' ms</td></tr>').join('') +
    '</tbody></table></div></details>';
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

  const hasEvidence = state.history.length > 0;
  const guidance = '<section class="workflow" aria-labelledby="workflow-title">' +
    '<div class="workflow-heading"><div><span class="eyebrow">' + t("workflowEyebrow") +
    '</span><h2 id="workflow-title">' + t("workflowTitle") +
    '</h2><p>' + t("workflowDescription") + '</p></div>' +
    '<span class="workflow-progress">' + (hasEvidence ? t("workflowHasEvidence") : t("workflowGettingStarted")) +
    '</span></div><ol class="workflow-steps">' +
    '<li class="workflow-step"><div class="step-index" aria-hidden="true">01</div><div class="step-content"><h3>' +
    t("workflowTargetTitle") + '</h3><p>' + t("workflowTargetDescription") +
    '</p><button type="button" class="inline-action" data-action="configureTarget">' +
    t("workflowTargetAction") + '<span aria-hidden="true"> ↗</span></button></div></li>' +
    '<li class="workflow-step"><div class="step-index" aria-hidden="true">02</div><div class="step-content"><h3>' +
    t("workflowLoadTitle") + '</h3><p>' + t("workflowLoadDescription") +
    '</p><button type="button" class="inline-action" data-tab="load">' +
    t("workflowLoadAction") + '<span aria-hidden="true"> →</span></button></div></li>' +
    '<li class="workflow-step' + (hasEvidence ? ' complete' : '') +
    '"><div class="step-index" aria-hidden="true">03</div><div class="step-content"><h3>' +
    t("workflowEvidenceTitle") + '</h3><p>' + t("workflowEvidenceDescription") +
    '</p><button type="button" class="inline-action" data-tab="history">' +
    t("workflowEvidenceAction") + '<span aria-hidden="true"> →</span></button></div></li>' +
    '</ol></section>';

  const cards = ([
    ['p95', metric ? numeric(metric.p95Ms) + ' ms' : '—', 'cardLatency'],
    ['rps', metric ? numeric(metric.requestsPerSecond) : '—', 'cardRps'],
    ['errors', metric ? numeric(metric.failedRate * 100) + '%' : '—', 'cardErrors'],
    ['requests', count(metric?.requests), 'cardRequests'],
  ] as const).map(([label, value, detail]) =>
    '<article class="metric"><div class="metric-label">' + t(label) + '</div>' +
    '<strong class="metric-value">' + escapeHtml(value) + '</strong>' +
    '<span class="metric-detail">' + t(detail) + '</span></article>').join('');

  const latest = state.latest;
  const previous = latest ? state.history.find(run =>
    run.id !== latest.id &&
    fingerprintScenario(run.scenario) === fingerprintScenario(latest.scenario)) : undefined;
  const difference = latest && previous ? compareRuns(previous, latest) : undefined;
  const comparator = difference ? '<article class="panel comparison-panel">' +
    '<div class="panel-heading"><div><h3>' + t("comparisonPreviewTitle") +
    '</h3><p>' + t("comparisonPreviewHelp") +
    '</p></div><span class="small-badge">' + escapeHtml(difference.status) + '</span></div>' +
    '<div class="comparison-grid"><div><span>' + t("comparisonBaseline") +
    '</span><strong>' + numeric(previous!.metrics.p95Ms) + ' ms</strong></div>' +
    '<div><span>' + t("comparisonLatest") +
    '</span><strong>' + numeric(latest!.metrics.p95Ms) + ' ms</strong></div>' +
    '<div><span>' + t("comparisonDelta") +
    '</span><strong>' + numeric(difference.deltaP95Percent) + '%</strong></div></div>' +
    '<p>' + t(difference.comparable ? "comparisonPreviewCaution" : "comparisonInconclusive") +
    '</p><div class="action-row">' +
    button("compare", "compare", "secondary", busy) + '</div></article>' : "";

  const historyItems = state.history.slice(0, 30);
  const historyRows = historyItems.map((run, index) => {
    const status = run.sloAssessment?.status ?? 'not-configured';
    const safeStatus = ['pass', 'fail', 'inconclusive', 'not-configured'].includes(status) ? status : 'unknown';
    return '<tr><th scope="row" class="run-identity"><strong>' + escapeHtml(run.scenario.name) +
      '</strong><small>' + escapeHtml(dateLabel(run.startedAt, locale)) +
      '</small></th><td>' + escapeHtml(run.scenario.model) + '</td><td class="num">' +
      numeric(run.metrics.p95Ms) + ' ms</td><td class="num">' + numeric(run.metrics.requestsPerSecond) +
      '</td><td><span class="status status-' + safeStatus + '">' +
      t('status_' + safeStatus) + '</span></td><td><button type="button" class="inline-action run-inspect" ' +
      'data-inspect-run="' + escapeHtml(run.id) + '" aria-controls="run-detail-' + index +
      '" aria-expanded="' + (index === 0 ? 'true' : 'false') + '">' + t('inspectRun') +
      '</button></td></tr>';
  }).join('');
  const historyTable = historyRows
    ? '<div class="table-wrap"><table><caption class="sr-only">' + t('history') +
      '</caption><thead><tr><th scope="col">' + t('scenario') +
      '</th><th scope="col">' + t('model') + '</th><th scope="col" class="num">' +
      t('p95') + '</th><th scope="col" class="num">' + t('rps') +
      '</th><th scope="col">' + t('slo') + '</th><th scope="col">' +
      t('inspection') + '</th></tr></thead><tbody>' + historyRows + '</tbody></table></div>'
    : '<div class="empty-state"><div class="empty-symbol" aria-hidden="true">◎</div>' +
      '<h3>' + t("emptyEvidenceTitle") + '</h3><p>' + t("emptyHistory") +
      '</p><button type="button" class="button button-primary" data-tab="load">' +
      t("emptyEvidenceAction") + '</button><span class="empty-caution">' +
      t("historyPrivacy") + '</span></div>';

  // Render measured values server-side, never trusting HTML or injecting JSON into the webview.
  const runDetails = historyItems.map((run, index) => {
    const status = run.sloAssessment?.status ?? 'not-configured';
    const safeStatus = ['pass', 'fail', 'inconclusive', 'not-configured'].includes(status) ? status : 'unknown';
    const measurements: Array<[string, string]> = [
      ['p50', numeric(run.metrics.p50Ms) + ' ms'],
      ['p95', numeric(run.metrics.p95Ms) + ' ms'],
      ['p99', numeric(run.metrics.p99Ms) + ' ms'],
      ['avg', numeric(run.metrics.avgMs) + ' ms'],
      ['rps', numeric(run.metrics.requestsPerSecond)],
      ['requests', count(run.metrics.requests)],
      ...(run.metrics.totalRequests !== undefined ?
        [['totalRequests', count(run.metrics.totalRequests)] as [string, string]] : []),
      ['errors', numeric(run.metrics.failedRate * 100) + '%'],
      ['dropped', count(run.metrics.droppedIterations)],
    ];
    const distribution = run.metrics.statusDistribution;
    const statuses = distribution ? '<div class="run-status-counts"><h4>' + t('httpStatusCounts') +
      '</h4><dl>' + Object.entries(distribution).map(([label, value]) =>
        '<div><dt>' + escapeHtml(label) + '</dt><dd>' + count(value) + '</dd></div>').join('') +
      '</dl></div>' : '';
    const violations = run.sloAssessment?.violations ?? [];
    const observations = [...violations, ...run.warnings];
    const findings = '<div class="run-findings"><h4>' + t('recordedFindings') + '</h4>' +
      (observations.length ? '<ul>' + observations.map(value => '<li>' + escapeHtml(value) +
      '</li>').join('') + '</ul>' : '<p>' + t('noRecordedFindings') + '</p>') + '</div>';
    return '<section class="panel run-detail" id="run-detail-' + index +
      '" role="region" aria-labelledby="run-detail-heading-' + index + '"' +
      (index > 0 ? ' hidden' : '') + '><div class="panel-heading"><div><span class="eyebrow">' +
      t('runInspector') + '</span><h3 id="run-detail-heading-' + index +
      '" tabindex="-1">' + escapeHtml(run.scenario.name) + '</h3><p>' +
      escapeHtml(dateLabel(run.startedAt, locale)) + ' · ' +
      escapeHtml(run.scenario.method) + ' · ' + escapeHtml(run.scenario.model) +
      '</p></div><span class="status status-' + safeStatus + '">' +
      t('status_' + safeStatus) + '</span></div>' +
      '<dl class="run-metrics">' + measurements.map(([key, value]) =>
        '<div><dt>' + t(key) + '</dt><dd>' + escapeHtml(value) + '</dd></div>').join('') +
      '</dl><div class="run-context"><span>' + t('scenarioFingerprint') +
      '</span><code>' + escapeHtml(run.scenarioHash ?? fingerprintScenario(run.scenario)) +
      '</code></div>' +
      (run.metrics.totalRequests !== undefined ?
        '<p class="phase-description">' + t('recordedMeasurementScope') + ': ' +
        (run.scenario.warmupSeconds ?? 0) + 's / ' +
        (run.scenario.durationSeconds - (run.scenario.warmupSeconds ?? 0) -
          (run.scenario.cooldownSeconds ?? 0)) + 's / ' +
        (run.scenario.cooldownSeconds ?? 0) + 's</p>' : '') + statuses + findings +
      '<p class="run-disclaimer">' + t('runInspectorCaution') + '</p></section>';
  }).join('');


  const scenarios = ([
    ['runSmoke', 'smokeTitle', 'smoke', 'scenarioClosed'],
    ['runStress', 'stressTitle', 'stress', 'scenarioClosed'],
    ['runArrival', 'arrivalTitle', 'arrival', 'scenarioOpen'],
    ['runRamp', 'rampTitle', 'ramp', 'scenarioRamp'],
  ] as const).map(([action, title, detail, tag], i) =>
    '<article class="preset"><div class="preset-index"><span>0' + (i + 1) +
    '</span><span>' + t(tag) + '</span></div><div class="preset-profile preset-profile-' +
    action.slice(3).toLowerCase() + '" aria-hidden="true">' +
    '<span></span><span></span><span></span><span></span><span></span><span></span>' +
    '</div><h3>' + t(title) + '</h3><p>' + t(detail) +
    '</p><div class="preset-action">' +
    button(action, 'execute', 'primary', busy) +
    '<button type="button" class="preset-select" data-preset="' +
    action.slice(3).toLowerCase() + '"' + (busy ? ' disabled' : '') +
    '>' + t('presetCustomize') + '<span aria-hidden="true"> →</span></button>' +
    '</div></article>').join('');

  const editField = (name: string, label: string, value: number, min: number, max: number): string =>
    '<label class="editor-field"><span>' + t(label) + '</span><input type="number" inputmode="numeric" name="' +
    name + '" required min="' + min + '" max="' + max + '" step="1" value="' + value + '"></label>';
  const customEditor = '<article class="panel custom-editor"><div class="panel-heading"><div><h3>' +
    t('customScenarioTitle') + '</h3><p>' + t('customScenarioDescription') +
    '</p></div><span class="small-badge">v2</span></div>' +
    '<div class="scenario-workspace"><form id="custom-scenario" class="custom-form"><div class="editor-fields">' +
    '<label class="editor-field editor-wide"><span>' + t('customName') +
    '</span><input type="text" name="name" maxlength="80" required value="Custom local load"></label>' +
    '<label class="editor-field"><span>' + t('model') +
    '</span><select name="model"><option value="constant-vus">' + t('scenarioClosed') +
    '</option><option value="constant-arrival-rate">' + t('scenarioOpen') +
    '</option><option value="ramping-vus">' + t('scenarioRamp') + '</option></select></label>' +
    '<label class="editor-field"><span>' + t('customMethod') +
    '</span><select name="method"><option>GET</option><option>HEAD</option></select></label>' +
    editField('durationSeconds', 'duration', state.durationSeconds ?? 10, 5, 120) +
    editField('warmupSeconds', 'warmupSeconds', 0, 0, 30) +
    editField('cooldownSeconds', 'cooldownSeconds', 0, 0, 30) +
    editField('virtualUsers', 'customVus', Math.min(5, state.maxVirtualUsers ?? 100), 1, state.maxVirtualUsers ?? 100) +
    editField('arrivalRate', 'customArrival', 10, 1, 500) +
    '<label class="editor-field editor-wide"><span>' + t('customRampStages') +
    '</span><input type="text" name="stages" maxlength="160" required ' +
    'value="5:2,5:0" aria-describedby="ramp-hint"><span id="ramp-hint">' +
    t('customRampHelp') + '</span></label>' +
    editField('maxRequests', 'maxRequests', state.maxRequests ?? 10000, 100, state.maxRequests ?? 10000) +
    editField('maxP95Ms', 'customP95', state.sloMaxP95Ms ?? 0, 0, 120000) +
    '</div><p class="fineprint">' + t('customTargetNote') + ' ' +
    '<code>' + escapeHtml(displayTarget(state.target)) + '</code></p>' +
    '<div class="action-row"><button class="button button-primary" type="submit"' +
    (busy ? ' disabled' : '') + '>' + t('customRun') + '</button>' +
    button('configureTarget', 'configure', 'secondary', busy) +
    '</div><p class="editor-disclaimer">' + t("editorDisclaimer") +
    '</p></form><aside class="scenario-preview" aria-labelledby="preview-title">' +
    '<div class="preview-eyebrow">' + t("previewEyebrow") + '</div>' +
    '<h4 id="preview-title">' + t("previewTitle") + '</h4>' +
    '<div class="preview-meta"><span>' + t("previewWorkload") +
    '</span><strong id="preview-model">—</strong></div>' +
    '<div class="preview-track-heading"><span>' + t("previewProfile") +
    '</span><span id="preview-duration">—</span></div>' +
    '<div id="preview-stage-chart" class="preview-stage-chart" role="img" aria-label="' +
    t("previewProfileA11y") + '"></div>' +
    '<div id="preview-phase-track" class="preview-phase-track" role="img" aria-label="' +
    t("phasePreviewA11y") + '">' +
    '<span data-phase="warmup"></span><span data-phase="measurement"></span>' +
    '<span data-phase="cooldown"></span></div>' +
    '<p class="phase-description" id="preview-phase-summary"></p>' +
    '<div class="preview-grid"><div><span>' + t("previewConcurrency") +
    '</span><strong id="preview-vus">—</strong></div><div><span>' + t("previewBudget") +
    '</span><strong id="preview-budget">—</strong></div></div>' +
    '<div class="preview-callout" id="preview-warning" role="status" aria-live="polite">' +
    t("previewReady") + '</div><div class="preview-safety"><span aria-hidden="true">◇</span>' +
    t("previewSafety") + '</div></aside></div></article>';

  const overview = '<section role="tabpanel" id="view-overview" data-view="overview" aria-labelledby="tab-overview">' +
    '<div class="hero"><div><span class="eyebrow green">' + t('workspaceHeading') +
    '</span><h2>' + t('heroTitle') + '</h2><p>' + t('heroDescription') +
    '</p><div class="action-row">' + button('runSmoke', 'quickStart', 'primary', busy) +
    button('configureTarget', 'configure', 'secondary', busy) +
    '</div></div><div class="endpoint"><span class="eyebrow">' + t('target') +
    '</span><code>' + escapeHtml(displayTarget(state.target)) + '</code><span class="endpoint-hint">' +
    t(state.allowRemoteTargets ? 'remoteAllowed' : 'loopbackDefault') +
    '</span></div></div>' + (hasEvidence ? '' : guidance) +
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
    '</div></article></div>' + comparator + (hasEvidence ? guidance : '') + '</section>';

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
    '</div>' + runDetails + '<div class="history-foot"><p>' + t('historyPrivacy') +
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
    diagTool('●', 'runtimeProbeTitle', 'runtimeProbeDescription', 'runtimeProbe', 'runtimeProbeRun') +
    '</div><div class="panel safety"><h3>' + t('safetyTitle') +
    '</h3><p>' + t('safety') + ' ' + t('help') + '</p></div></section>';

  const css = [
    ':root{color-scheme:light dark;--bg:var(--vscode-editor-background,#11151b);--fg:var(--vscode-foreground,#e8edf2);--muted:var(--vscode-descriptionForeground,#92a0aa);--border:var(--vscode-panel-border,#303741);--surface:var(--vscode-sideBar-background,#191f27);--accent:var(--vscode-charts-green,#38cbb8);--focus:var(--vscode-focusBorder,#38cbb8);font-family:var(--vscode-font-family,system-ui);font-size:13px}',
    '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);line-height:1.5}button{font:inherit}button:focus-visible{outline:2px solid var(--focus);outline-offset:2px}[hidden]{display:none!important}',
    '.shell{max-width:1500px;margin:0 auto;padding:0 42px 52px}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:24px 0;border-bottom:1px solid var(--border)}.brand{display:flex;gap:14px;align-items:center}.logo{width:46px;height:46px;display:grid;place-items:center;background:rgba(56,203,184,.08);color:var(--accent);border:1px solid rgba(56,203,184,.35);border-radius:13px;font-size:24px;font-weight:800}.eyebrow{color:var(--muted);font-size:10px;font-weight:750;letter-spacing:1.3px;text-transform:uppercase}.green{color:var(--accent)}h1{font-size:22px;letter-spacing:-.6px;margin:2px 0 0;line-height:1.15}.version{font-size:11px;font-weight:500;border:1px solid var(--border);border-radius:40px;padding:3px 8px;color:var(--muted);vertical-align:middle;letter-spacing:0}.state{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:12px}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent)}.dot.active{background:#e9b765}',
    '.tabs{display:flex;gap:6px;border-bottom:1px solid var(--border);overflow:auto;margin-bottom:24px}.tabs button{padding:18px 23px;color:var(--muted);background:none;border:0;position:relative;white-space:nowrap;font-weight:650;cursor:pointer}.tabs button[aria-selected=true]{color:var(--fg)}.tabs button[aria-selected=true]:after{content:"";position:absolute;bottom:0;left:17px;right:17px;height:2px;background:var(--accent)}.tabs button:hover{color:var(--fg)}',
    '.notice{border:1px solid var(--border);border-left:3px solid var(--accent);background:var(--surface);border-radius:7px;padding:11px 14px;color:var(--muted);font-size:12px;margin-bottom:24px}.notice[aria-busy=true]{border-left-color:#e9b765}.notice strong{color:var(--fg)}',
    '.hero{display:grid;grid-template-columns:1.4fr 1fr;gap:28px;align-items:center;background:linear-gradient(108deg,rgba(56,203,184,.10),transparent 68%),var(--surface);border:1px solid rgba(56,203,184,.25);border-radius:14px;padding:34px}.hero h2{font-size:34px;letter-spacing:-1px;line-height:1.14;margin:12px 0}.hero p{color:var(--muted);font-size:14px;max-width:580px;margin:0 0 22px}.endpoint{background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:23px;display:flex;flex-direction:column;gap:12px;min-width:0}.endpoint code{font:13px var(--vscode-editor-font-family,monospace);word-break:break-all}.endpoint-hint{color:var(--muted);font-size:11px}.action-row{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.button{border:1px solid var(--border);border-radius:7px;min-height:35px;white-space:nowrap;padding:8px 14px;cursor:pointer;font-weight:650}.button:disabled{opacity:.42;cursor:not-allowed}.button-primary{background:var(--vscode-button-background,#147c72);color:var(--vscode-button-foreground,#ffffff);border-color:transparent}.button-primary:hover:not(:disabled){background:var(--vscode-button-hoverBackground,#0f685e)}.button-secondary{background:var(--bg);color:var(--fg)}.button-secondary:hover:not(:disabled){border-color:var(--accent)}.button-danger{background:transparent;color:var(--vscode-errorForeground,#e68680);border-color:rgba(230,134,128,.3)}.button-danger:hover:not(:disabled){background:rgba(230,134,128,.10)}',
    '.section-title{display:flex;justify-content:space-between;align-items:flex-end;gap:15px;margin:30px 0 17px}.section-title h2{font-size:21px;margin:3px 0;letter-spacing:-.4px}.section-title p{margin:3px 0;color:var(--muted);font-size:12px}.subtle{color:var(--muted);font-size:12px}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.metric{min-width:0;background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:20px}.metric-label{text-transform:uppercase;letter-spacing:1.15px;color:var(--muted);font-size:10px;font-weight:730}.metric-value{display:block;font-size:29px;letter-spacing:-.8px;font-variant-numeric:tabular-nums;margin:10px 0 6px}.metric-detail{color:var(--muted);font-size:11px}',
    '.columns{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(285px,1fr);gap:14px;margin-top:14px}.panel{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:22px;min-width:0}.panel h3{font-size:15px;margin:0 0 15px}.panel p{color:var(--muted);font-size:12px}.panel-heading{display:flex;justify-content:space-between;gap:12px}.panel-heading h3{margin:0}.panel-heading p{margin:5px 0}.small-badge{font-size:10px;color:var(--muted);border:1px solid var(--border);border-radius:20px;padding:4px 9px;white-space:nowrap;align-self:flex-start}.plot{display:block;width:100%;max-height:195px}.gridline{fill:none;stroke:var(--border);stroke-width:1}.series{fill:none;stroke:var(--accent);stroke-width:3;stroke-linejoin:round;stroke-linecap:round}.point{fill:var(--surface);stroke:var(--accent);stroke-width:3}.axis{display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}.empty{padding:46px 12px;color:var(--muted);text-align:center}.line{display:flex;justify-content:space-between;gap:8px;padding:12px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--muted)}.line strong{color:var(--fg);font-variant-numeric:tabular-nums;text-align:right;overflow-wrap:anywhere}.bottom-action{margin-top:19px}',
    '.presets{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}.preset{background:var(--surface);border:1px solid var(--border);border-radius:11px;padding:20px;display:flex;flex-direction:column;min-height:246px}.preset-index{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:11px;color:var(--muted)}.preset-index span:first-child{color:var(--accent);font-weight:800}.preset h3{font-size:18px;margin:25px 0 7px}.preset p{font-size:12px;color:var(--muted);margin:0}.preset-action{margin-top:auto;padding-top:20px}.preset-action .button{width:100%}.spaced{margin-top:21px}.pilot{border-color:rgba(56,203,184,.25)}.fineprint{font-size:11px!important;margin-top:18px!important}',
    '.comparison-panel{margin-top:14px}.comparison-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:12px}.comparison-grid div{display:flex;flex-direction:column;gap:6px}.comparison-grid span{font-size:11px;color:var(--muted)}.comparison-grid strong{font-size:18px;font-variant-numeric:tabular-nums}.chart-data{margin-top:12px;color:var(--muted);font-size:12px}.chart-data summary{cursor:pointer}.chart-data table{min-width:320px}.protocol{margin-top:15px}.protocol .panel-heading{margin-bottom:14px}.custom-editor{margin-top:15px}.custom-editor .panel-heading{margin-bottom:18px}.custom-form{display:flex;flex-direction:column;gap:12px}.editor-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px}.editor-field{display:flex;flex-direction:column;gap:6px;color:var(--muted);font-size:11px;font-weight:650}.editor-wide{grid-column:span 2}.editor-field input,.editor-field select{width:100%;border:1px solid var(--border);border-radius:7px;background:var(--bg);color:var(--fg);padding:9px 10px;min-height:37px;font:inherit;font-size:12px}.editor-field :is(input,select):focus-visible{outline:2px solid var(--focus);outline-offset:1px}.custom-form code{color:var(--fg);overflow-wrap:anywhere}.custom-form .fineprint{margin:1px 0!important}' ,
    '.table-wrap{overflow-x:auto;width:100%}table{border-collapse:collapse;width:100%;min-width:670px}th{text-align:left;font-size:11px;color:var(--muted);padding:12px 15px;border-bottom:1px solid var(--border)}td{padding:16px 15px;border-bottom:1px solid var(--border);font-size:12px}tr:last-child td{border-bottom:0}td strong{display:block}td small{display:block;color:var(--muted);margin-top:3px}.num{text-align:right;font-variant-numeric:tabular-nums}.status{font-size:11px;border:1px solid var(--border);border-radius:20px;padding:4px 9px}.status-pass{color:var(--accent)}.status-fail{color:var(--vscode-errorForeground,#e68680)}.status-inconclusive{color:#e9b765}.history-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:15px}.history-foot p{font-size:11px;color:var(--muted)}',
    '.run-identity{padding:16px 15px;text-align:left;border-bottom:1px solid var(--border);font-size:12px}.run-identity strong{display:block}.run-identity small{display:block;color:var(--muted);font-weight:400;margin-top:3px}.run-inspect{white-space:nowrap}.run-detail{margin-top:15px;background:linear-gradient(125deg,color-mix(in srgb,var(--accent) 5%,var(--surface)),var(--surface))}.run-detail .panel-heading{align-items:flex-start;margin-bottom:18px}.run-detail .panel-heading h3{margin:5px 0 4px;font-size:19px}.run-detail .panel-heading h3:focus-visible{outline:2px solid var(--focus);outline-offset:3px}.run-detail .panel-heading p{margin:0}.run-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:11px;margin:0 0 18px}.run-metrics>div{display:flex;flex-direction:column;gap:5px;border:1px solid var(--border);border-radius:8px;background:var(--bg);padding:13px;min-width:0}.run-metrics dt,.run-status-counts dt{color:var(--muted);font-size:11px}.run-metrics dd{font-size:19px;font-weight:700;line-height:1.2;letter-spacing:-.2px;margin:0;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.run-context{display:flex;flex-direction:column;gap:7px;margin-bottom:17px}.run-context span{font-size:11px;color:var(--muted)}.run-context code{font-size:11px;font-family:var(--vscode-editor-font-family,monospace);overflow-wrap:anywhere;color:var(--fg)}.run-status-counts h4,.run-findings h4{font-size:12px;margin:10px 0}.run-status-counts dl{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 15px}.run-status-counts dl>div{display:flex;gap:7px;align-items:center;border:1px solid var(--border);padding:6px 10px;border-radius:6px}.run-status-counts dd{margin:0;font-variant-numeric:tabular-nums;font-weight:650}.run-findings p,.run-findings li{color:var(--muted);font-size:12px;overflow-wrap:anywhere}.run-findings ul{margin:8px 0;padding-left:18px}.run-disclaimer{border-top:1px solid var(--border);padding-top:12px;font-size:11px!important;margin-bottom:0}.run-detail [hidden]{display:none}@media(max-width:1100px){.run-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:500px){.run-metrics{grid-template-columns:1fr 1fr}}',
    '.preview-phase-track{display:flex;width:100%;height:7px;gap:2px;margin-top:13px;background:var(--border);border-radius:5px;overflow:hidden}.preview-phase-track span{display:block;min-width:0;height:100%}.preview-phase-track [data-phase=warmup]{background:var(--vscode-charts-orange,#cb925e)}.preview-phase-track [data-phase=measurement]{background:var(--accent)}.preview-phase-track [data-phase=cooldown]{background:var(--vscode-charts-blue,#72a4f5)}.phase-description{font-size:11px!important;color:var(--muted);margin:7px 0 13px!important;overflow-wrap:anywhere}',
    '.diagnostics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.diagnostic{display:flex;flex-direction:column;min-height:260px;align-items:flex-start}.diagnostic .action-row{margin-top:auto}.diagnostic p{font-size:12px}.diag-symbol{display:grid;place-items:center;width:41px;height:41px;border-radius:10px;background:rgba(56,203,184,.09);color:var(--accent);font-weight:800;font-size:19px;margin-bottom:17px}.safety{margin-top:15px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.footer{margin-top:40px;padding-top:20px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;display:flex;justify-content:space-between;gap:15px}',
    '.activity-track{height:3px;margin-top:11px;border-radius:4px;background:var(--border);overflow:hidden}.activity-track span{display:block;width:34%;height:100%;background:var(--accent);animation:saturivo-progress 1.6s ease-in-out infinite alternate}@keyframes saturivo-progress{from{transform:translateX(-90%)}to{transform:translateX(280%)}}@media(prefers-reduced-motion:reduce){.activity-track span{animation:none;width:100%}}.preset-profile{display:flex;align-items:flex-end;gap:5px;height:58px;padding:12px 9px 0;border-bottom:1px solid var(--border);margin-top:16px;overflow:hidden}.preset-profile span{flex:1;height:55%;background:color-mix(in srgb,var(--accent) 45%,var(--surface));border-radius:3px 3px 0 0}.preset-profile-stress span{height:82%}.preset-profile-arrival span{height:38%;background:color-mix(in srgb,var(--vscode-charts-blue,#699dc8) 75%,var(--surface))}.preset-profile-ramp span:nth-child(1){height:18%}.preset-profile-ramp span:nth-child(2){height:38%}.preset-profile-ramp span:nth-child(3){height:78%}.preset-profile-ramp span:nth-child(4){height:90%}.preset-profile-ramp span:nth-child(5){height:48%}.preset-profile-ramp span:nth-child(6){height:14%}.preset h3{margin-top:17px}.preset-action{display:flex;flex-direction:column;gap:9px}.preset-select{cursor:pointer;border:0;background:transparent;color:var(--vscode-textLink-foreground,var(--accent));min-height:32px;font:inherit;font-weight:650;text-align:center}.preset-select:hover{text-decoration:underline}.preset-select:disabled{opacity:.4;cursor:not-allowed}.preset-select:focus-visible{outline:2px solid var(--focus);outline-offset:2px}.workflow{margin-top:22px;padding:24px 27px;border:1px solid var(--border);border-radius:12px;background:var(--surface)}.workflow-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:21px}.workflow-heading h2{font-size:18px;letter-spacing:-.4px;margin:4px 0}.workflow-heading p{font-size:12px;color:var(--muted);margin:4px 0}.workflow-progress{font-size:11px;color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);padding:7px 11px;border-radius:30px;flex-shrink:0}.workflow-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;list-style:none;padding:0;margin:0}.workflow-step{min-width:0;padding:16px;border:1px solid var(--border);border-radius:10px;background:var(--bg);display:flex;align-items:flex-start;gap:13px}.workflow-step.complete{border-color:color-mix(in srgb,var(--accent) 48%,var(--border))}.step-index{display:grid;place-items:center;width:34px;height:34px;border-radius:9px;background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--accent);font-weight:800;font-size:11px;font-variant-numeric:tabular-nums;flex-shrink:0}.step-content{min-width:0}.step-content h3{margin:1px 0 5px;font-size:13px}.step-content p{font-size:11px;color:var(--muted);margin:0 0 11px}.inline-action{appearance:none;border:0;padding:0;background:none;color:var(--vscode-textLink-foreground,var(--accent));font-weight:650;cursor:pointer;text-align:left;font-size:12px}.inline-action:hover{text-decoration:underline}.inline-action:focus-visible{outline:2px solid var(--focus);outline-offset:4px}.empty-state{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;min-height:310px;justify-content:center;padding:32px}.empty-symbol{width:62px;height:62px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent) 40%,var(--border));border-radius:17px;background:color-mix(in srgb,var(--accent) 8%,var(--bg));color:var(--accent);font-size:30px}.empty-state h3{font-size:18px;margin:2px 0 0}.empty-state p{font-size:12px;color:var(--muted);max-width:350px;margin:0}.empty-caution{font-size:11px;color:var(--muted);max-width:410px}.scenario-workspace{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(230px,.85fr);gap:24px;align-items:start}.scenario-preview{position:sticky;top:15px;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 6%,var(--bg)),var(--bg) 70%);border:1px solid var(--border);border-radius:11px;padding:20px;min-width:0}.preview-eyebrow{color:var(--accent);font-size:10px;font-weight:750;letter-spacing:1.2px;text-transform:uppercase}.scenario-preview h4{font-size:16px;letter-spacing:-.3px;margin:7px 0 21px}.preview-meta{display:flex;justify-content:space-between;gap:10px;font-size:11px;padding:0 0 16px;border-bottom:1px solid var(--border)}.preview-meta span,.preview-track-heading{color:var(--muted)}.preview-meta strong{color:var(--fg);text-align:right}.preview-track-heading{display:flex;justify-content:space-between;gap:10px;font-size:11px;margin:20px 0 10px}.preview-stage-chart{height:56px;display:flex;gap:3px;align-items:stretch;background:color-mix(in srgb,var(--accent) 5%,var(--bg));padding:7px;border:1px solid var(--border);border-radius:8px;overflow:hidden}.stage-segment{display:block;min-width:0;border-radius:4px;background:var(--accent);box-shadow:inset 0 -12px 14px rgba(0,0,0,.09)}.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:17px 0}.preview-grid>div{display:flex;flex-direction:column;gap:5px;padding:11px;background:var(--surface);border:1px solid var(--border);border-radius:8px;min-width:0}.preview-grid span{font-size:10px;color:var(--muted)}.preview-grid strong{font-size:18px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.preview-callout{padding:12px;border-left:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 6%,var(--bg));font-size:11px;color:var(--fg);line-height:1.5}.preview-callout.preview-invalid{border-left-color:var(--vscode-errorForeground,#e58b84);color:var(--vscode-errorForeground,#e58b84)}.preview-safety{display:flex;gap:7px;align-items:flex-start;font-size:10px;color:var(--muted);margin-top:12px}.preview-safety span{color:var(--accent)}.editor-disclaimer{color:var(--muted);font-size:11px;margin:2px 0 0}.custom-editor .panel-heading{padding-bottom:14px;border-bottom:1px solid var(--border)}.button{transition:background-color .16s ease,border-color .16s ease,box-shadow .16s ease}.panel,.preset,.metric{box-shadow:0 3px 12px rgba(0,0,0,.025)}.preset:hover,.diagnostic:hover{border-color:color-mix(in srgb,var(--accent) 35%,var(--border))}.metric:first-child{border-top:2px solid var(--accent)}.metric:nth-child(2){border-top:2px solid var(--vscode-charts-blue,#72a4f5)}.metric:nth-child(3){border-top:2px solid var(--vscode-charts-orange,#cb925e)}.metric:nth-child(4){border-top:2px solid var(--vscode-charts-purple,#ad86d8)}',
    '@media(max-width:1100px){.metrics,.presets,.editor-fields{grid-template-columns:repeat(2,minmax(0,1fr))}.columns,.hero{grid-template-columns:1fr}.diagnostics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:900px){.scenario-workspace{grid-template-columns:1fr}.scenario-preview{position:static}.workflow-steps{grid-template-columns:1fr}.workflow-heading{align-items:flex-start;flex-direction:column}}@media(max-width:700px){.shell{padding:0 18px 36px}.topbar{flex-wrap:wrap}.hero{padding:24px}.tabs button{padding:14px 12px}.diagnostics{grid-template-columns:1fr}.section-title,.history-foot{align-items:flex-start;flex-direction:column}}@media(max-width:420px){.metrics,.presets,.editor-fields{grid-template-columns:1fr}.editor-wide{grid-column:auto}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}',
  ].join('');
  const script = [
    'const vscode=acquireVsCodeApi();',
    'const previewLabels=' + JSON.stringify({
      closed: translate(locale,"scenarioClosed"), arrival: translate(locale,"scenarioOpen"),
      ramp: translate(locale,"scenarioRamp"), invalid: translate(locale,"previewInvalid"),
      ready: translate(locale,"previewReady"), seconds: translate(locale,"previewSeconds"),
      users: translate(locale,"customVus"),
      warmup: translate(locale,"warmupSeconds"),
      cooldown: translate(locale,"cooldownSeconds"),
      measured: translate(locale,"measurementWindow"),
    }) + ';',
    'const tabs=Array.from(document.querySelectorAll("[role=tab][data-tab]"));',
    'function selectTab(name,focus){if(!tabs.some(t=>t.dataset.tab===name))name="overview";',
    'for(const tab of tabs){const active=tab.dataset.tab===name;tab.setAttribute("aria-selected",String(active));tab.tabIndex=active?0:-1;if(active&&focus)tab.focus();}',
    'for(const panel of document.querySelectorAll("[role=tabpanel][data-view]"))panel.hidden=panel.dataset.view!==name;',
    'vscode.setState({...((vscode.getState()||{})),activeTab:name});}',
    'const last=vscode.getState();selectTab(last&&typeof last.activeTab==="string"?last.activeTab:"overview",false);',
    'const inspectControls=Array.from(document.querySelectorAll("button[data-inspect-run]"));',
    'function inspectRun(id,focus){let selected=null;',
    'for(const control of inspectControls){const active=control.dataset.inspectRun===id;',
    'control.setAttribute("aria-expanded",String(active));',
    'const panel=document.getElementById(control.getAttribute("aria-controls"));',
    'if(panel)panel.hidden=!active;if(active)selected=panel;}',
    'if(selected){vscode.setState({...((vscode.getState()||{})),selectedRunId:id});',
    'if(focus){selected.scrollIntoView({block:"nearest"});',
    'const heading=selected.querySelector("h3");if(heading)heading.focus({preventScroll:true});}}}',
    'if(inspectControls.length){const stored=vscode.getState()||{};',
    'const selected=inspectControls.find(button=>button.dataset.inspectRun===stored.selectedRunId);',
    'inspectRun((selected||inspectControls[0]).dataset.inspectRun,false);}',
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
    'function updatePreview(){',
    'const field=name=>custom.elements.namedItem(name);const value=name=>{const el=field(name);return el&&"value"in el?el.value:"";};',
    'const model=value("model"),vus=Number(value("virtualUsers")),seconds=Number(value("durationSeconds"));',
    'const budget=Number(value("maxRequests"));',
    'const warmup=Number(value("warmupSeconds")),cooldown=Number(value("cooldownSeconds"));',
    'const measured=seconds-warmup-cooldown;',
    'const chart=document.getElementById("preview-stage-chart");if(!chart)return;',
    'const label=document.getElementById("preview-model"),length=document.getElementById("preview-duration");',
    'const ceiling=document.getElementById("preview-vus"),requests=document.getElementById("preview-budget");',
    'const warning=document.getElementById("preview-warning");',
    'label.textContent=({ "constant-vus":previewLabels.closed, "constant-arrival-rate":previewLabels.arrival, "ramping-vus":previewLabels.ramp })[model]||model;',
    'length.textContent=Number.isFinite(seconds)&&Number.isFinite(measured)?seconds+" "+previewLabels.seconds+" · "+measured+" "+previewLabels.measured:"—";',
    'ceiling.textContent=Number.isFinite(vus)?String(vus):"—";',
    'requests.textContent=Number.isFinite(budget)?budget.toLocaleString():"—";',
    'const phaseTrack=document.getElementById("preview-phase-track");',
    'const phaseSummary=document.getElementById("preview-phase-summary");',
    'const phaseNames=["warmup","measurement","cooldown"];',
    'const phaseValues=[warmup,measured,cooldown];',
    'phaseSummary.textContent=phaseValues.map((count,i)=>count+"s "+previewLabels[i===0?"warmup":i===1?"measured":"cooldown"]).join(" · ");',
    'phaseTrack.setAttribute("aria-label",phaseSummary.textContent);',
    'for(let i=0;i<3;i++){const part=phaseTrack.querySelector("[data-phase="+phaseNames[i]+"]");',
    'if(part){part.hidden=phaseValues[i]<=0;part.style.flexGrow=String(Math.max(0,phaseValues[i]));}}',
    'chart.replaceChildren();let stages=[];let invalid=false;',
    'if(model==="ramping-vus"){',
    'const parts=value("stages").split(",").map(s=>s.trim());let total=0;',
    'for(const part of parts){const match=/^([0-9]+):([0-9]+)$/.exec(part);',
    'if(!match){invalid=true;break;}const duration=Number(match[1]),users=Number(match[2]);',
    'if(!Number.isSafeInteger(duration)||duration<1||!Number.isSafeInteger(users)||users<0||users>vus){invalid=true;break;}',
    'stages.push({duration,users});total+=duration;}',
    'if(parts.length<2||parts.length>8||total!==seconds)invalid=true;',
    '}else{stages=[{duration:seconds,users:vus}];}',
    'if(!Number.isInteger(seconds)||seconds<5||seconds>120||!Number.isInteger(vus)||vus<1||',
    'vus>Number(field("virtualUsers").max)||!Number.isInteger(budget)||budget<100||',
    'budget>Number(field("maxRequests").max)||!value("name").trim())invalid=true;',
    'if(!Number.isInteger(warmup)||warmup<0||warmup>30||',
    '!Number.isInteger(cooldown)||cooldown<0||cooldown>30||measured<5)invalid=true;',
    'if(model==="constant-arrival-rate"){const rate=Number(value("arrivalRate"));',
    'if(!Number.isInteger(rate)||rate<1||rate>500)invalid=true;}',
    'if(!invalid){for(const stage of stages){const segment=document.createElement("span");segment.className="stage-segment";',
    'segment.style.flexGrow=String(stage.duration);segment.style.opacity=String(Math.max(.22,stage.users/Math.max(1,vus)));',
    'segment.title=stage.duration+" "+previewLabels.seconds+" · "+stage.users+" VUs";',
    'chart.appendChild(segment);}}',
    'chart.setAttribute("aria-label",invalid?previewLabels.invalid:stages.map(s=>s.duration+"s "+s.users+" VUs").join(", "));',
    'warning.textContent=invalid?previewLabels.invalid:previewLabels.ready;',
    'warning.classList.toggle("preview-invalid",invalid);',
    'const submit=custom.querySelector("button[type=submit]");if(submit)submit.disabled=invalid||' +
      (busy ? 'true' : 'false') + ';',
    '}',
    'toggleModels();updatePreview();',
    'function saveCustom(){vscode.setState({...((vscode.getState()||{})),custom:Object.fromEntries(new FormData(custom).entries())});}',
    'custom.addEventListener("input",()=>{saveCustom();updatePreview();});',
    'custom.addEventListener("change",()=>{toggleModels();saveCustom();updatePreview();});',
    'const presets={smoke:{model:"constant-vus",duration:"10",vus:1},',
    'stress:{model:"constant-vus",duration:"10",vus:20},',
    'arrival:{model:"constant-arrival-rate",duration:"10",vus:20,rate:25},',
    'ramp:{model:"ramping-vus",duration:"20",vus:10,stages:"5:2,10:10,5:0"}};',
    'for(const action of document.querySelectorAll("button[data-preset]")){',
    'action.addEventListener("click",()=>{const preset=presets[action.dataset.preset];if(!preset)return;',
    'const set=(name,value)=>{const element=custom.elements.namedItem(name);if(element&&"value"in element)element.value=String(value);};',
    'const max=Number(custom.elements.namedItem("virtualUsers").max);',
    'const vus=Math.min(preset.vus,max);set("model",preset.model);set("durationSeconds",preset.duration);set("virtualUsers",vus);',
    'if(preset.rate)set("arrivalRate",preset.rate);',
    'if(preset.stages)set("stages","5:"+Math.min(2,max)+",10:"+vus+",5:0");',
    'toggleModels();saveCustom();updatePreview();selectTab("load",false);',
    'custom.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});',
    'const name=custom.elements.namedItem("name");if(name)name.focus({preventScroll:true});',
    '});}',
    'custom.addEventListener("submit",event=>{event.preventDefault();',
    'if(document.getElementById("preview-warning").classList.contains("preview-invalid"))return;',
    'const payload=Object.fromEntries(new FormData(custom).entries());saveCustom();',
    'vscode.postMessage({action:"runCustom",payload});});}',
    'document.addEventListener("click",event=>{const elem=event.target;if(!(elem instanceof Element))return;',
    'const inspector=elem.closest("button[data-inspect-run]");if(inspector){inspectRun(inspector.dataset.inspectRun,true);return;}',
    'const nav=elem.closest("button[data-tab]");if(nav){selectTab(nav.dataset.tab,nav.getAttribute("role")!=="tab");return;}',
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
    '<div><div class="eyebrow">ARMOTUSITIO / PERFORMANCE ENGINEERING</div><h1>Saturivo <span class="version">0.2.0</span></h1></div></div>',
    '<div class="state"><span class="dot' + (busy ? ' active' : '') + '" aria-hidden="true"></span><span>' +
      t(busy ? 'running' : 'idle') + '</span>' + (busy ? button('cancel', 'cancel', 'danger') : '') + '</div></header>',
    '<nav class="tabs" role="tablist" aria-label="' + t('navigation') + '">' +
      tab('overview', true) + tab('load', false) + tab('history', false) + tab('diagnostics', false) + '</nav>',
    '<div class="notice" role="status" aria-live="polite" aria-busy="' + busy + '"><strong>' +
      t(busy ? 'running' : 'idleShort') + '</strong> · ' +
      escapeHtml(state.message || t(busy ? 'running' : 'readyMessage')) +
      (busy ? '<div class="activity-track" role="progressbar" aria-label="' +
        t("progressIndeterminate") + '"><span></span></div>' : '') + '</div>',
    overview, load, history, diagnostics,
    '<footer class="footer"><span>' + t('localFirst') + '</span><span>' + t('footerDisclaimer') + '</span></footer></main>',
    '<script nonce="' + nonce + '">' + script + '</script></body></html>',
  ].join('');
}
