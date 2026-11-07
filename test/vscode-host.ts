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
    "saturivo.capacityPilot", "saturivo.runRamp", "saturivo.importJson", "saturivo.clearProfiles",
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
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
