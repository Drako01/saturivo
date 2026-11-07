import * as vscode from "vscode";
import { compareRuns } from "./core/comparison";
import { runGo, type GoTask } from "./core/go";
import { captureGoProfile, localPprofEndpoint, type GoProfileKind } from "./core/go-profiler";
import { analyzeGoroutineStacks, summarizeGoPprof } from "./core/go-profile-analysis";
import { captureGoLoadTimeline, goCorrelationMarkdown } from "./core/go-correlation";
import { readGoGcMetrics } from "./core/go-gc";
import { readFile, rm } from "node:fs/promises";
import { HistoryStore, isStoredRun, migrateImportedRun } from "./core/history";
import { runK6 } from "./core/k6";
import { parseScenarioEditorInput } from "./core/scenario-editor";
import { runWebSocketProbe as executeWebSocketProbe, validateWebSocketTarget, webSocketReport } from "./core/websocket";
import { readRuntimeSnapshot, type RuntimeKind } from "./core/runtime-adapters";
import { markdownReport } from "./core/report";
import { parseGoRaceOutput, type GoRaceFinding } from "./core/race";
import { compareTrialGroups } from "./core/statistics";
import { fingerprintScenario } from "./core/fingerprint";
import { assertLiteralLoopback, discoverLocalCapacity } from "./core/capacity";
import type { RunResult, Scenario } from "./core/types";
import { assertAllowedTarget, isRemoteTarget, validateScenario } from "./core/validation";
import { dashboard, type DashboardState } from "./ui/html";
import { translate } from "./ui/localize";

type Preset = "smoke" | "stress" | "arrival" | "ramp";

class Saturivo implements vscode.WebviewViewProvider, vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private launcher?: vscode.WebviewView;
  private controller: AbortController | undefined;
  private busy = false;
  private message = "";
  private latest: RunResult | undefined;
  private history: RunResult[] = [];
  private raceFindings: GoRaceFinding[] = [];
  private readonly store: HistoryStore;
  private readonly output = vscode.window.createOutputChannel("Saturivo");
  private readonly raceDiagnostics = vscode.languages.createDiagnosticCollection("saturivo");
  private readonly storageDir: string;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.storageDir = context.storageUri?.fsPath ?? context.globalStorageUri.fsPath;
    this.store = new HistoryStore(this.storageDir, this.historyRetention());
    void this.loadHistory();
  }

  private t(key: string): string { return translate(vscode.env.language, key); }
  private config(): vscode.WorkspaceConfiguration { return vscode.workspace.getConfiguration("saturivo"); }
  private target(): string { return this.config().get<string>("target", "http://127.0.0.1:8080/"); }
  private maxVus(): number { return this.config().get<number>("maxVirtualUsers", 100); }
  private allowRemote(): boolean { return this.config().get<boolean>("allowRemoteTargets", false); }
  private historyRetention(): number { return this.config().get<number>("historyRetention", 100); }
  /** Multi-root source identity must be selected, never guessed from the first folder. */
  private async chooseLoadWorkspace(): Promise<string | undefined> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length === 0) return undefined;
    if (folders.length === 1) return folders[0]?.uri.fsPath;
    const selected = await vscode.window.showQuickPick(
      folders.map(folder => ({ label: folder.name, description: folder.uri.fsPath,
        value: folder.uri.fsPath })),
      { title: this.t("chooseLoadFolder"), placeHolder: this.t("chooseLoadFolder") }
    );
    return selected?.value;
  }

  /**
   * The Activity Bar remains a stable launcher. The actual dashboard lives in an
   * editor webview tab, not in a cramped secondary sidebar.
   */
  async resolveWebviewView(view: vscode.WebviewView): Promise<void> {
    this.launcher = view;
    view.webview.options = { enableScripts: false };
    view.webview.html = "<!doctype html><html><head><meta charset='UTF-8'>" +
      "<meta http-equiv='Content-Security-Policy' content=\"default-src 'none'\">" +
      "</head><body><p>" + this.t("editorLauncher") + "</p></body></html>";
    view.onDidChangeVisibility(() => {
      if (view.visible) void this.openHome();
    }, undefined, this.context.subscriptions);
    if (view.visible) void this.openHome();
  }

  private onDashboardMessage(raw: unknown): void {
    if (!raw || typeof raw !== "object") return;
    const message = raw as { action?: unknown; payload?: unknown };
    const commands: Readonly<Record<string, string>> = {
      configureTarget: "saturivo.configureTarget", runSmoke: "saturivo.runSmoke",
      runStress: "saturivo.runStress", runArrival: "saturivo.runArrival",
      runRamp: "saturivo.runRamp", capacityPilot: "saturivo.capacityPilot",
      compare: "saturivo.compare", export: "saturivo.export",
      exportJson: "saturivo.exportJson", exportSarif: "saturivo.exportSarif",
      importJson: "saturivo.importJson", clearProfiles: "saturivo.clearProfiles",
      clearHistory: "saturivo.clearHistory", configureSlo: "saturivo.configureSlo",
      goRace: "saturivo.goRace", goBench: "saturivo.goBench",
      websocketProbe: "saturivo.websocketProbe",
      runtimeProbe: "saturivo.runtimeProbe",
      captureGoProfile: "saturivo.captureGoProfile",
      correlateGo: "saturivo.correlateGo", cancel: "saturivo.cancel",
    };
    if (message.action === "runCustom") {
      void this.runCustom(message.payload).catch(error => {
        void vscode.window.showErrorMessage("Saturivo: " +
          (error instanceof Error ? error.message : String(error)));
      });
      return;
    }
    if (typeof message.action !== "string") return;
    const command = commands[message.action];
    if (command) void vscode.commands.executeCommand(command);
  }

  private refresh(): void {
    void vscode.commands.executeCommand("setContext", "saturivo.busy", this.busy);
    const state: DashboardState = {
      target: this.target(), busy: this.busy, history: this.history,
      message: this.message, ...(this.latest ? { latest: this.latest } : {}),
      allowRemoteTargets: this.allowRemote(),
      durationSeconds: this.config().get<number>("durationSeconds", 10),
      maxVirtualUsers: this.maxVus(),
      maxRequests: this.config().get<number>("maxRequests", 10000),
      sloMaxP95Ms: this.config().get<number>("sloMaxP95Ms", 0),
    };
    if (this.panel) this.panel.webview.html = dashboard(state, vscode.env.language);
  }

  configurationChanged(): void {
    try {
      this.store.setRetention(this.historyRetention());
      void this.store.prune(this.historyRetention()).then(() => this.loadHistory())
        .catch(error => this.output.appendLine("History retention: " + String(error)));
    } catch (error) { this.output.appendLine("Invalid history retention: " + String(error)); }
    this.refresh();
  }

  async openHome(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Active);
    } else {
      const panel = vscode.window.createWebviewPanel(
        "saturivo.dashboard", this.t("title"), vscode.ViewColumn.Active,
        { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] }
      );
      this.panel = panel;
      panel.webview.onDidReceiveMessage(raw => this.onDashboardMessage(raw),
        undefined, this.context.subscriptions);
      panel.onDidDispose(() => {
        if (this.panel === panel) this.panel = undefined;
      }, undefined, this.context.subscriptions);
      this.refresh();
    }
    // VS Code initially opens the Activity Bar's view. Close only that
    // transient launcher; never close the user's Explorer or Search sidebar
    // when the dashboard is opened through the command palette.
    if (this.launcher?.visible) {
      await vscode.commands.executeCommand("workbench.action.closeSidebar");
    }
  }

  private async loadHistory(): Promise<void> {
    try {
      this.history = await this.store.list();
      this.latest = this.history[0];
      this.refresh();
    } catch (error) { this.output.appendLine("History read failed: " + String(error)); }
  }

  async configureTarget(): Promise<void> {
    const input = await vscode.window.showInputBox({
      title: this.t("target"), value: this.target(),
      placeHolder: "http://127.0.0.1:8080/health",
      validateInput: value => {
        try {
          assertAllowedTarget(value, {
            allowRemoteTargets: this.allowRemote(), maxVirtualUsers: this.maxVus(),
          });
          return undefined;
        } catch (error) { return String(error instanceof Error ? error.message : error); }
      },
    });
    if (input === undefined) return;
    assertAllowedTarget(input, { allowRemoteTargets: this.allowRemote(), maxVirtualUsers: this.maxVus() });
    await this.config().update("target", input, vscode.ConfigurationTarget.Workspace);
    this.message = "";
    this.refresh();
  }

  async configureSlo(): Promise<void> {
    const value = await vscode.window.showInputBox({
      title: this.t("configureSlo"),
      prompt: this.t("sloPrompt"),
      value: String(this.config().get<number>("sloMaxP95Ms", 0)),
      validateInput: input => {
        const parsed = Number(input);
        return Number.isFinite(parsed) && (parsed === 0 || parsed >= 1 && parsed <= 120_000) ?
          undefined : "P95 SLO must be 0 (disabled) or 1–120000 ms";
      },
    });
    if (value === undefined) return;
    await this.config().update("sloMaxP95Ms", Number(value), vscode.ConfigurationTarget.Workspace);
    this.refresh();
  }

  private scenario(preset: Preset): Scenario {
    const max = this.maxVus();
    const duration = this.config().get<number>("durationSeconds", 10);
    const maxP95Ms = this.config().get<number>("sloMaxP95Ms", 0);
    const common = { target: this.target(), method: "GET" as const, durationSeconds: duration,
      ...(maxP95Ms > 0 ? { slo: { maxP95Ms } } : {}) };
    switch (preset) {
      case "smoke":
        return { ...common, id: "smoke", name: "Smoke", model: "constant-vus", virtualUsers: 1 };
      case "stress":
        return { ...common, id: "stress", name: "Bounded stress", model: "constant-vus",
          virtualUsers: Math.min(20, max) };
      case "ramp":
        return { ...common, id: "ramp", name: "Ramp · 5/10/5 seconds",
          workloadVersion: 2, model: "ramping-vus", durationSeconds: 20,
          virtualUsers: Math.min(10, max),
          stages: [
            { durationSeconds: 5, targetVus: Math.min(2, max) },
            { durationSeconds: 10, targetVus: Math.min(10, max) },
            { durationSeconds: 5, targetVus: 0 },
          ],
        };
      case "arrival":
        return { ...common, id: "arrival", name: "Arrival-rate", model: "constant-arrival-rate",
          virtualUsers: Math.min(20, max), arrivalRate: 25 };
    }
  }

  async runtimeProbe(): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const kinds: readonly RuntimeKind[] = ["node", "java", "python"];
    const picked = await vscode.window.showQuickPick(
      kinds.map(value => ({ label: value, value })),
      { title: this.t("runtimeProbeTitle"),
        placeHolder: this.t("runtimeProbeDescription") }
    );
    const runtime = picked?.value;
    if (!runtime) return;
    const entered = await vscode.window.showInputBox({
      title: this.t("runtimeProbePid"),
      prompt: this.t("runtimeProbePidHelp"),
      validateInput: raw => /^[1-9][0-9]{0,6}$/.test(raw) &&
        Number(raw) <= 4194304 ? undefined : this.t("runtimeProbeInvalidPid"),
    });
    if (!entered) return;
    const pid = Number(entered);
    const agreed = await vscode.window.showWarningMessage(
      this.t("runtimeProbeConsent") + " " + runtime + " PID " + pid,
      { modal: true }, this.t("runtimeProbeConfirm")
    );
    if (agreed !== this.t("runtimeProbeConfirm") || this.busy) return;
    const observed = await readRuntimeSnapshot(runtime, pid);
    const lines = ["# Saturivo — " + this.t("runtimeProbeTitle"), "",
      "Runtime: " + runtime, "PID: " + pid, "Status: " + observed.status,
      ...(observed.status === "SUPPORTED" ? [
        "Observed RSS: " + observed.rssBytes + " bytes",
        "Observed OS threads: " + observed.threads,
        this.t("runtimeProbeCaution"),
      ] : [this.t("runtimeNotSupported") + ": " + observed.reason]),
      "", this.t("runtimeProbeNoSecrets")];
    const document = await vscode.workspace.openTextDocument({
      content: lines.join("\n"), language: "markdown",
    });
    await vscode.window.showTextDocument(document, { preview: false });
    this.output.appendLine("Runtime adapter " + runtime + " status: " + observed.status);
  }

  async websocketProbe(): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const proposal = this.target().replace(/^https?:/i, "ws:");
    const entered = await vscode.window.showInputBox({
      title: this.t("websocketTitle"),
      prompt: this.t("websocketPrompt"),
      value: proposal,
      validateInput: value => {
        try { validateWebSocketTarget(value); return undefined; }
        catch (error) { return error instanceof Error ? error.message : String(error); }
      },
    });
    if (entered === undefined) return;
    validateWebSocketTarget(entered);
    const consent = await vscode.window.showWarningMessage(
      this.t("websocketConsent") + " " + entered,
      { modal: true }, this.t("websocketAuthorize")
    );
    if (consent !== this.t("websocketAuthorize") || this.busy) return;
    this.busy = true;
    this.controller = new AbortController();
    this.message = this.t("websocketRunning");
    this.refresh();
    try {
      const evidence = await executeWebSocketProbe(
        entered, this.config().get<string>("k6Path", "k6"),
        this.storageDir, this.controller.signal
      );
      this.output.appendLine("WebSocket probe: " + JSON.stringify(evidence));
      const document = await vscode.workspace.openTextDocument({
        content: webSocketReport(evidence), language: "markdown",
      });
      await vscode.window.showTextDocument(document, { preview: false });
      this.message = this.t("websocketComplete");
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
      if (this.message !== "Cancelled") {
        void vscode.window.showErrorMessage("Saturivo: " + this.message);
      }
    } finally {
      this.busy = false;
      this.controller = undefined;
      this.refresh();
    }
  }

  async runPreset(preset: Preset): Promise<void> {
    await this.executeScenario(this.scenario(preset));
  }

  private async runCustom(raw: unknown): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const policy = { allowRemoteTargets: this.allowRemote(), maxVirtualUsers: this.maxVus(),
      maxRequests: this.config().get<number>("maxRequests", 10000) };
    const scenario = parseScenarioEditorInput(raw, this.target(), policy);
    await this.executeScenario(scenario);
  }

  private async executeScenario(input: Scenario): Promise<void> {
    if (this.busy) { void vscode.window.showWarningMessage("Saturivo: another task is already running."); return; }
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const policy = { allowRemoteTargets: this.allowRemote(), maxVirtualUsers: this.maxVus(),
      maxRequests: this.config().get<number>("maxRequests", 10000) };
    const scenario = validateScenario(input, policy);
    const sourceRoot = await this.chooseLoadWorkspace();
    if ((vscode.workspace.workspaceFolders?.length ?? 0) > 1 && !sourceRoot) return;
    if (isRemoteTarget(scenario.target)) {
      const agreed = await vscode.window.showWarningMessage(
        "Saturivo will send load to " + scenario.target + ". Confirm that you own or are authorized to test this service.",
        { modal: true }, "Run authorized test"
      );
      if (agreed !== "Run authorized test") return;
    }
    this.busy = true;
    this.message = this.t("running") + ": " + scenario.name;
    this.controller = new AbortController();
    this.refresh();
    try {
      const run = await runK6(
        scenario, policy, this.config().get<string>("k6Path", "k6"),
        this.storageDir, this.controller.signal, sourceRoot
      );
      await this.store.save(run);
      await this.loadHistory();
      this.latest = run;
      this.message = scenario.name + " · P95 " + run.metrics.p95Ms.toFixed(2) +
        " ms · " + run.metrics.requestsPerSecond.toFixed(2) + " req/s";
      this.output.appendLine(this.message);
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
      this.output.appendLine(this.message);
      if (this.message !== "Cancelled") {
        void vscode.window.showErrorMessage("Saturivo: " + this.message +
          ". Check that k6 is installed and reachable.");
      }
    } finally {
      this.busy = false;
      this.controller = undefined;
      this.refresh();
    }
  }

  async runCapacityPilot(): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const maxP95Ms = this.config().get<number>("sloMaxP95Ms", 0);
    if (!Number.isFinite(maxP95Ms) || maxP95Ms < 1) {
      void vscode.window.showWarningMessage(this.t("capacityRequiresSlo"));
      return;
    }
    const requestsLimit = this.config().get<number>("maxRequests", 10000);
    const policy = {
      allowRemoteTargets: false,
      maxVirtualUsers: this.maxVus(),
      maxRequests: requestsLimit,
    };
    const target = this.target();
    assertLiteralLoopback(target);
    const plannedBudget = Math.min(20_000, requestsLimit * 3);
    const confirmed = await vscode.window.showWarningMessage(
      this.t("capacityConsent") + " " + target +
        " · 10–40 arrivals/s · ≤3 × 10s · ≤" + plannedBudget +
        " " + this.t("capacityRequests"),
      { modal: true }, this.t("capacityAuthorize")
    );
    if (confirmed !== this.t("capacityAuthorize") || this.busy) return;
    this.busy = true;
    this.controller = new AbortController();
    this.message = this.t("capacityRunning");
    this.refresh();
    try {
      const result = await discoverLocalCapacity({
        target, durationSeconds: 10, virtualUsers: Math.min(20, this.maxVus()),
        startRate: 10, maxRate: 40, maxSteps: 3,
        maxRequestsPerStep: Math.min(5000, requestsLimit),
        totalRequestBudget: plannedBudget,
        slo: { maxP95Ms, maxErrorPercent: 1 },
      }, policy, async (scenario, signal) => {
        const run = await runK6(
          scenario, policy, this.config().get<string>("k6Path", "k6"),
          this.storageDir, signal
        );
        await this.store.save(run);
        await this.loadHistory();
        this.latest = run;
        return run;
      }, this.controller.signal, (rate, step) => {
        this.message = this.t("capacityRunning") + " " + step + "/3 · " + rate + " arrivals/s";
        this.refresh();
      });
      this.output.appendLine("Saturivo local capacity pilot: " + JSON.stringify(result, null, 2));
      this.message = this.t("capacityObserved") + ": " +
        (result.highestPassingArrivalRate === null ?
          this.t("capacityNone") : String(result.highestPassingArrivalRate) + " arrivals/s") +
        " · " + result.stopReason + ". " + this.t("capacityCaution");
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
      this.output.appendLine("Saturivo capacity pilot: " + this.message);
      if (this.message !== "Cancelled") void vscode.window.showErrorMessage(
        "Saturivo: " + this.message);
    } finally {
      this.busy = false;
      this.controller = undefined;
      this.refresh();
    }
  }

  cancel(): void { this.controller?.abort(); }

  async compare(): Promise<void> {
    const items = await this.store.list(40);
    if (items.length < 2) {
      void vscode.window.showInformationMessage(this.t("compareRequiresTwo"));
      return;
    }
    const latest = items[0];
    if (!latest) return;
    const candidates = items.slice(1).map(run => ({
      label: run.scenario.name + " · " + new Date(run.startedAt).toLocaleString(),
      description: "P95 " + run.metrics.p95Ms.toFixed(2) + " ms",
      detail: fingerprintScenario(run.scenario) === fingerprintScenario(latest.scenario)
        ? this.t("compatibleBaseline") : this.t("incompatibleBaseline"),
      run,
    }));
    const selection = await vscode.window.showQuickPick(candidates, {
      title: this.t("chooseBaseline"), placeHolder: this.t("chooseBaselineHelp"),
      matchOnDescription: true, matchOnDetail: true,
    });
    if (!selection) return;
    const baseline = selection.run;
    const result = compareRuns(baseline, latest);
    // Statistical evidence is only shown for the latest non-overlapping 3+3
    // groups when the selected baseline belongs to the previous group.
    const matching = items.filter(item =>
      fingerprintScenario(item.scenario) === fingerprintScenario(latest.scenario));
    const trials = matching.length >= 6 &&
      matching.slice(3, 6).some(item => item.id === baseline.id) ?
      compareTrialGroups(matching.slice(3, 6), matching.slice(0, 3)) : undefined;
    const report = markdownReport(latest, result, trials);
    const document = await vscode.workspace.openTextDocument({ content: report, language: "markdown" });
    await vscode.window.showTextDocument(document, { preview: false });
    this.message = "Comparison: " + result.status;
    this.refresh();
  }

  async exportReport(): Promise<void> {
    if (!this.latest) { void vscode.window.showInformationMessage("Saturivo: run a test first."); return; }
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri ?? this.context.globalStorageUri;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(folder, "saturivo-report.md"),
      filters: { Markdown: ["md"] }, saveLabel: "Export report",
    });
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(markdownReport(this.latest), "utf8"));
    void vscode.window.showInformationMessage("Saturivo: report exported.");
  }

  async exportJson(): Promise<void> {
    if (!this.latest) { void vscode.window.showInformationMessage("Saturivo: run a test first."); return; }
    // JSON exports remain lossless for reimport; explicit consent protects target URLs and host metadata.
    const confirm = this.t("exportJsonConfirm");
    const approval = await vscode.window.showWarningMessage(
      this.t("exportJsonDisclosure"), { modal: true }, confirm
    );
    if (approval !== confirm) return;
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri ?? this.context.globalStorageUri;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(folder, "saturivo-run.json"),
      filters: { JSON: ["json"] }, saveLabel: "Export JSON evidence",
    });
    if (!uri) return;
    await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(this.latest, null, 2), "utf8"));
  }

  async importJson(): Promise<void> {
    if (this.busy) return;
    const selected = await vscode.window.showOpenDialog({
      canSelectMany: false, canSelectFolders: false, canSelectFiles: true,
      openLabel: this.t("importJson"), filters: { JSON: ["json"] },
    });
    const uri = selected?.[0];
    if (!uri) return;
    const metadata = await vscode.workspace.fs.stat(uri);
    if (metadata.size <= 0 || metadata.size > 100_000) throw new Error(this.t("importInvalid"));
    let candidate: unknown;
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      if (bytes.byteLength > 100_000) throw new Error(this.t("importInvalid"));
      candidate = JSON.parse(Buffer.from(bytes).toString("utf8"));
    } catch { throw new Error(this.t("importInvalid")); }
    if (!isStoredRun(candidate)) throw new Error(this.t("importInvalid"));
    await this.store.save(migrateImportedRun(candidate));
    await this.loadHistory();
    this.message = this.t("importSuccess");
    this.refresh();
  }

  async clearProfiles(): Promise<void> {
    if (this.busy) return;
    const confirmation = await vscode.window.showWarningMessage(
      this.t("clearProfilesWarning"), { modal: true }, this.t("clearProfilesConfirm")
    );
    if (confirmation !== this.t("clearProfilesConfirm")) return;
    await rm(vscode.Uri.joinPath(vscode.Uri.file(this.storageDir), "go-profiles").fsPath,
      { recursive: true, force: true });
    this.message = this.t("clearProfilesSuccess");
    this.refresh();
  }

  async exportRaceSarif(): Promise<void> {
    if (!this.raceFindings.length) {
      void vscode.window.showInformationMessage("Saturivo: run Go race detection and obtain findings first.");
      return;
    }
    const folder = vscode.workspace.workspaceFolders?.[0]?.uri ?? this.context.globalStorageUri;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.joinPath(folder, "saturivo-race.sarif"),
      filters: { SARIF: ["sarif"], JSON: ["json"] },
      saveLabel: "Export verified Go race findings",
    });
    if (!uri) return;
    const { raceFindingsToSarif } = await import("./core/sarif");
    await vscode.workspace.fs.writeFile(uri, Buffer.from(
      JSON.stringify(raceFindingsToSarif(this.raceFindings), null, 2), "utf8"));
  }

  async clearHistory(): Promise<void> {
    if (this.busy) return;
    const choice = await vscode.window.showWarningMessage(
      this.t("historyClearWarning"), { modal: true }, this.t("historyClearConfirm")
    );
    if (choice !== this.t("historyClearConfirm")) return;
    const deleted = await this.store.clear();
    this.history = [];
    this.latest = undefined;
    this.message = this.t("historyCleared") + " (" + deleted + ")";
    this.refresh();
  }

  private folder(): string | undefined {
    const active = vscode.window.activeTextEditor?.document.uri;
    if (active) {
      const folder = vscode.workspace.getWorkspaceFolder(active);
      if (folder) return folder.uri.fsPath;
    }
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  async runGoTask(task: GoTask): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const folders = vscode.workspace.workspaceFolders ?? [];
    let folder: string | undefined;
    if (folders.length === 1) folder = folders[0]?.uri.fsPath;
    else if (folders.length > 1) {
      const selected = await vscode.window.showQuickPick(
        folders.map(item => ({ label: item.name, description: item.uri.fsPath, value: item.uri.fsPath })),
        { placeHolder: this.t("chooseGoFolder"), title: this.t("chooseGoFolder") }
      );
      folder = selected?.value;
      if (!folder) return;
    }
    if (!folder) throw new Error("Open a folder containing a Go project first.");
    const response = await vscode.window.showWarningMessage(
      "Saturivo will execute Go " + task + " tests in " + folder +
        ". Tests may run project code or access configured services.",
      { modal: true }, "Execute"
    );
    if (response !== "Execute") return;
    this.busy = true;
    this.message = this.t("runningGo") + ": " + task;
    this.controller = new AbortController();
    this.refresh();
    try {
      const result = await runGo(task, folder, this.controller.signal);
      this.output.appendLine("Go " + task + " exited: " + result.exitCode);
      if (task === "race") {
        this.raceDiagnostics.clear();
        const findings = parseGoRaceOutput(result.output, folder);
        this.raceFindings = findings;
        const grouped = new Map<string, vscode.Diagnostic[]>();
        for (const finding of findings) {
          const location = new vscode.Range(finding.line - 1, 0, finding.line - 1, 0);
          const diagnostic = new vscode.Diagnostic(location, finding.description,
            vscode.DiagnosticSeverity.Warning);
          diagnostic.source = "Saturivo · go test -race";
          diagnostic.code = "GO_RACE_EVIDENCE";
          const previous = grouped.get(finding.file) ?? [];
          previous.push(diagnostic);
          grouped.set(finding.file, previous);
        }
        for (const [file, diagnostics] of grouped) {
          this.raceDiagnostics.set(vscode.Uri.file(file), diagnostics);
        }
        if (findings.length) this.output.appendLine("Go race findings with source locations: " + findings.length);
      }
      this.output.appendLine(result.output);
      this.message = "Go " + task + ": exit code " + result.exitCode;
      const doc = await vscode.workspace.openTextDocument({
        content: result.output + (result.truncated ? "\n[Output truncated]" : ""),
        language: "plaintext",
      });
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
      if (this.message !== "Cancelled") void vscode.window.showErrorMessage("Saturivo: " + this.message);
    } finally {
      this.busy = false;
      this.controller = undefined;
      this.refresh();
    }
  }

  async correlateGo(): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const origin = this.config().get<string>("goProfilerOrigin", "http://127.0.0.1:6060/");
    const target = this.target();
    assertLiteralLoopback(target);
    localPprofEndpoint(origin, "goroutine");
    const approved = await vscode.window.showWarningMessage(
      this.t("correlateConsent") + " " + target + " / " + origin +
      ". " + this.t("correlateCaution"),
      { modal: true }, this.t("correlateAuthorize")
    );
    if (approved !== this.t("correlateAuthorize") || this.busy) return;
    const policy = {
      allowRemoteTargets: false, maxVirtualUsers: this.maxVus(),
      maxRequests: this.config().get<number>("maxRequests", 10000),
    };
    const scenario = validateScenario(this.scenario("smoke"), policy);
    this.busy = true;
    this.controller = new AbortController();
    this.message = this.t("correlateRunning");
    this.refresh();
    try {
      const evidence = await captureGoLoadTimeline(
        async (_phase, signal) => captureGoProfile(origin, "goroutine", this.storageDir, signal),
        async signal => runK6(scenario, policy,
          this.config().get<string>("k6Path", "k6"), this.storageDir, signal),
        this.controller.signal,
        phase => {
          this.message = this.t("correlateRunning") + ": " + phase;
          this.refresh();
        },
        async (_phase, signal) => readGoGcMetrics(origin, signal)
      );
      await this.store.save(evidence.run);
      await this.loadHistory();
      const document = await vscode.workspace.openTextDocument({
        content: goCorrelationMarkdown(evidence), language: "markdown",
      });
      await vscode.window.showTextDocument(document, { preview: false });
      this.message = this.t("correlateComplete");
      this.output.appendLine("Go correlation: " + this.message);
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
      this.output.appendLine("Go correlation: " + this.message);
      if (this.message !== "Cancelled") void vscode.window.showErrorMessage("Saturivo: " + this.message);
    } finally {
      this.busy = false;
      this.controller = undefined;
      this.refresh();
    }
  }

  async captureProfile(): Promise<void> {
    if (this.busy) return;
    if (!vscode.workspace.isTrusted) throw new Error("A trusted workspace is required.");
    const kinds: readonly GoProfileKind[] = ["goroutine", "cpu", "heap", "mutex", "block", "trace"];
    const selection = await vscode.window.showQuickPick(kinds, {
      title: this.t("profile"),
      placeHolder: this.t("profileChoose"),
    });
    if (!selection || !kinds.includes(selection as GoProfileKind)) return;
    const kind = selection as GoProfileKind;
    const origin = this.config().get<string>("goProfilerOrigin", "http://127.0.0.1:6060/");
    localPprofEndpoint(origin, kind);
    const accepted = await vscode.window.showWarningMessage(
      this.t("profileConsent") + " " + origin + " (" + selection + ").",
      { modal: true }, this.t("profileAuthorize")
    );
    if (accepted !== this.t("profileAuthorize")) return;
    this.busy = true;
    this.controller = new AbortController();
    this.message = this.t("profileRunning");
    this.refresh();
    try {
      const evidence = await captureGoProfile(origin, kind, this.storageDir, this.controller.signal);
      this.output.appendLine("Go pprof " + evidence.kind + ": " + evidence.localPath +
        " (" + evidence.bytes + " bytes)");
      this.message = this.t("profileSaved") + " (" + evidence.bytes + " bytes)";
      if (kind === "trace") {
        const document = await vscode.workspace.openTextDocument({
          content: this.t("traceSaved") + "\n" + evidence.localPath + "\n\n" +
            this.t("traceCaution"),
          language: "plaintext",
        });
        await vscode.window.showTextDocument(document, { preview: false });
      } else if (kind === "goroutine") {
        const snapshotText = await readFile(evidence.localPath, "utf8");
        const snapshot = analyzeGoroutineStacks(snapshotText);
        const summary = [
          "Go goroutine snapshot · observed stacks: " + snapshot.observedStacks,
          ...Object.entries(snapshot.states).map(([state, count]) => state + ": " + count),
          "",
          "Snapshot alone is not evidence of a goroutine leak.",
          "",
          snapshotText,
        ].join("\n");
        const document = await vscode.workspace.openTextDocument({
          content: summary, language: "plaintext",
        });
        await vscode.window.showTextDocument(document, { preview: false });
      } else {
        try {
          const workspace = this.folder() ?? this.storageDir;
          const top = await summarizeGoPprof(evidence.localPath, workspace, this.controller.signal);
          const document = await vscode.workspace.openTextDocument({
            content: "Saturivo · Go " + kind + " profile\n" +
              "Saved locally: " + evidence.localPath + "\n\n" + top,
            language: "plaintext",
          });
          await vscode.window.showTextDocument(document, { preview: false });
        } catch (error) {
          this.output.appendLine("Profile saved but pprof summary unavailable: " + String(error));
          void vscode.window.showWarningMessage(this.t("profileSaved") + " — " + evidence.localPath +
            " (Go tool pprof unavailable)");
        }
      }
    } catch (error) {
      this.message = error instanceof Error ? error.message : String(error);
      if (this.message !== "Cancelled") void vscode.window.showErrorMessage("Saturivo: " + this.message);
    } finally {
      this.busy = false;
      this.controller = undefined;
      this.refresh();
    }
  }

  dispose(): void { this.cancel(); this.panel?.dispose(); this.output.dispose(); this.raceDiagnostics.dispose(); }
}

export function activate(context: vscode.ExtensionContext): void {
  const app = new Saturivo(context);
  context.subscriptions.push(app, vscode.window.registerWebviewViewProvider("saturivo.control", app, {
    webviewOptions: { retainContextWhenHidden: true },
  }));
  const actions: Record<string, () => Promise<void> | void> = {
    openHome: () => app.openHome(),
    configureTarget: () => app.configureTarget(),
    configureSlo: () => app.configureSlo(),
    runSmoke: () => app.runPreset("smoke"),
    runStress: () => app.runPreset("stress"),
    runArrival: () => app.runPreset("arrival"),
    runRamp: () => app.runPreset("ramp"),
    capacityPilot: () => app.runCapacityPilot(),
    cancel: () => app.cancel(),
    compare: () => app.compare(),
    export: () => app.exportReport(),
    exportJson: () => app.exportJson(),
    importJson: () => app.importJson(),
    clearProfiles: () => app.clearProfiles(),
    exportSarif: () => app.exportRaceSarif(),
    clearHistory: () => app.clearHistory(),
    goRace: () => app.runGoTask("race"),
    goBench: () => app.runGoTask("benchmark"),
    captureGoProfile: () => app.captureProfile(),
    correlateGo: () => app.correlateGo(),
    websocketProbe: () => app.websocketProbe(),
    runtimeProbe: () => app.runtimeProbe(),
  };
  for (const [key, action] of Object.entries(actions)) {
    context.subscriptions.push(vscode.commands.registerCommand("saturivo." + key, async () => {
      try { await action(); }
      catch (error) {
        void vscode.window.showErrorMessage("Saturivo: " +
          (error instanceof Error ? error.message : String(error)));
      }
    }));
  }
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(change => {
    if (change.affectsConfiguration("saturivo")) app.configurationChanged();
  }));
}

export function deactivate(): void { /* All resources are owned by the extension context. */ }
