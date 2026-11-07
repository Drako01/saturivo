"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const {
  downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath,
} = require("@vscode/test-electron");

const BASE = "a3eaa3768b6b43e811a0b7b6bf1b71e574a644a0";
const CANDIDATE_VERSION = require("../package.json").version;

function command(executable, args, cwd, timeout = 120000) {
  const outcome = spawnSync(executable, args, {
    cwd, encoding: "utf8", shell: false, timeout, stdio: "pipe",
    env: { ...process.env, npm_config_audit: "false" },
  });
  if (outcome.error || outcome.status !== 0) {
    throw new Error(executable + " " + args.slice(0, 2).join(" ") + ": " +
      String(outcome.error || outcome.stderr || outcome.stdout).slice(-3000));
  }
  return outcome.stdout || "";
}

function installedExtensions(executable, directory) {
  const [bin, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable);
  return command(bin, [...args, "--extensions-dir", directory, "--list-extensions",
    "--show-versions"], process.cwd()).trim().toLowerCase();
}

function install(executable, directory, vsix) {
  const [bin, ...args] = resolveCliArgsFromVSCodeExecutablePath(executable);
  command(bin, [...args, "--extensions-dir", directory,
    "--install-extension", vsix, "--force"], process.cwd());
}

async function main() {
  const repo = path.resolve(__dirname, "..");
  const candidate = path.join(repo, "saturivo.vsix");
  assert(fs.existsSync(candidate), "Candidate VSIX for " + CANDIDATE_VERSION + " must already exist");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "saturivo-upgrade-"));
  const baseline = path.join(directory, "old-revision");
  const extensions = path.join(directory, "extensions");
  fs.mkdirSync(extensions, { recursive: true });
  let worktreeCreated = false;
  try {
    // CI checkout must use fetch-depth: 0 to make the immutable baseline available.
    command("git", ["cat-file", "-e", BASE + "^{commit}"], repo);
    command("git", ["worktree", "add", "--detach", baseline, BASE], repo);
    worktreeCreated = true;
    command("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
      baseline, 180000);
    command("npm", ["run", "build"], baseline, 180000);
    const oldVsix = path.join(directory, "saturivo-0.1.0.vsix");
    command(path.join(baseline, "node_modules", ".bin", "vsce"),
      ["package", "--no-dependencies", "--out", oldVsix], baseline, 180000);

    const executable = await downloadAndUnzipVSCode("1.99.0");
    install(executable, extensions, oldVsix);
    assert(installedExtensions(executable, extensions).includes("armotusitio.saturivo@0.1.0"),
      "Baseline 0.1.0 must be installed before upgrade");
    install(executable, extensions, candidate);
    const after = installedExtensions(executable, extensions);
    assert(after.includes("armotusitio.saturivo@" + CANDIDATE_VERSION),
      "Candidate " + CANDIDATE_VERSION + " must replace the previous installed version");
    assert(!after.includes("armotusitio.saturivo@0.1.0"),
      "Old extension version must not remain selected after upgrade");
    console.log("VSIX install/upgrade 0.1.0 -> " + CANDIDATE_VERSION + ": PASS (actual VS Code CLI)");
  } finally {
    if (worktreeCreated) {
      try { command("git", ["worktree", "remove", "--force", baseline], repo); }
      catch (error) { console.error("Worktree cleanup warning:", error); }
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
