"use strict";
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const {
  downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests,
} = require("@vscode/test-electron");

function cli(executable, base, args) {
  const [binary, ...prefix] = resolveCliArgsFromVSCodeExecutablePath(executable);
  const result = spawnSync(binary, [...prefix, "--extensions-dir", base, ...args], {
    stdio: "pipe", encoding: "utf8", shell: false, timeout: 90_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("VS Code CLI failed: " + result.stderr);
  return result.stdout;
}
async function main() {
  const root = path.resolve(__dirname, "..");
  const isolated = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-vscode-host-"));
  const installedExtensions = path.join(isolated, "extensions");
  const userData = path.join(isolated, "user-data");
  fs.mkdirSync(installedExtensions, { recursive: true });
  fs.mkdirSync(userData, { recursive: true });
  try {
    const vscodeExecutablePath = await downloadAndUnzipVSCode("1.99.0");
    const vsix = path.join(root, "saturivo.vsix");
    if (!fs.existsSync(vsix)) throw new Error("Build the packaged VSIX before host smoke");
    cli(vscodeExecutablePath, installedExtensions, [
      "--install-extension", vsix, "--force",
    ]);
    const installed = cli(vscodeExecutablePath, installedExtensions, ["--list-extensions"]);
    if (!installed.toLowerCase().includes("armotusitio.saturivo")) {
      throw new Error("VSIX is not listed as installed by VS Code CLI");
    }
    console.log("Packaged Saturivo VSIX installation: PASS");
    await runTests({
      vscodeExecutablePath,
      extensionDevelopmentPath: root,
      extensionTestsPath: path.join(root, "out", "test", "vscode-host.js"),
      launchArgs: [
        path.join(root, "test"),
        "--disable-gpu",
        "--disable-updates",
        "--skip-welcome",
        "--skip-release-notes",
        "--disable-workspace-trust",
        "--extensions-dir", installedExtensions,
        "--user-data-dir", userData,
      ],
    });
  } finally {
    fs.rmSync(isolated, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
