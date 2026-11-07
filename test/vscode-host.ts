import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import * as vscode from "vscode";

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("armotusitio.saturivo");
  assert(extension, "Saturivo must be visible to VS Code's installed extension registry");
  await extension.activate();
  // Control Center must be reachable as an editor tab, not just a narrow sidebar.
  const commands = await vscode.commands.getCommands(true);
  for (const command of [
    "saturivo.openHome", "saturivo.runSmoke", "saturivo.cancel",
    "saturivo.goRace", "saturivo.captureGoProfile", "saturivo.configureSlo",
    "saturivo.capacityPilot", "saturivo.correlateGo", "saturivo.runRamp", "saturivo.importJson", "saturivo.clearProfiles",
    "saturivo.websocketProbe",
  ]) assert(commands.includes(command), "Expected command registered: " + command);

  let requests = 0;
  const server = createServer((_req, res) => { requests++; res.end("ok"); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Invalid address");
    const configuration = vscode.workspace.getConfiguration("saturivo");
    await configuration.update("target", "http://127.0.0.1:" + address.port + "/",
      vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("saturivo.openHome");
    await new Promise(resolve => setTimeout(resolve, 500));
    assert.equal(requests, 0, "Opening the Control Center must not generate traffic");
    // TabInputWebview.viewType may be namespaced differently by VS Code
    // versions. Assert the user-visible Saturivo editor tab and Webview kind.
    let dashboardTab = false;
    const tabDeadline = Date.now() + 5000;
    while (!dashboardTab && Date.now() < tabDeadline) {
      const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs);
      dashboardTab = tabs.some(tab =>
        tab.input instanceof vscode.TabInputWebview && /Saturivo/i.test(tab.label));
      if (!dashboardTab) await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!dashboardTab) {
      const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs)
        .map(tab => ({ label: tab.label, type: tab.input.constructor.name,
          viewType: tab.input instanceof vscode.TabInputWebview ? tab.input.viewType : null }));
      console.log("Observed VS Code editor tabs: " + JSON.stringify(tabs));
    }
    assert(dashboardTab, "Control Center must open a Webview in the main editor area");
    // This integration host has a real k6 binary and a disposable loopback server.
    // The workload must start only after explicit command invocation, and cancel.
    const running = vscode.commands.executeCommand("saturivo.runSmoke");
    const deadline = Date.now() + 20000;
    while (requests === 0 && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(requests > 0, "Explicitly invoked k6 run must reach the loopback fixture");
    await vscode.commands.executeCommand("saturivo.cancel");
    await running;
    const ended = requests;
    await new Promise(resolve => setTimeout(resolve, 600));
    assert.equal(requests, ended, "Cancel must terminate outbound workload traffic");
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
