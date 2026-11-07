"use strict";
const path = require("node:path");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const root = path.resolve(__dirname, "..");
  await runTests({
    extensionDevelopmentPath: root,
    extensionTestsPath: path.join(root, "out", "test", "vscode-host.js"),
    version: "1.99.0",
    launchArgs: [
      path.join(root, "test"),
      "--disable-gpu",
      "--disable-updates",
      "--skip-welcome",
      "--skip-release-notes",
      "--disable-extensions",
      "--disable-workspace-trust",
    ],
  });
}
main().catch(error => { console.error(error); process.exitCode = 1; });
