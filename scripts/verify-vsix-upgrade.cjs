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

function command(executable, args, cwd, timeout = 120000, additionalEnv = {}) {
  const outcome = spawnSync(executable, args, {
    cwd, encoding: "utf8", shell: false, timeout, stdio: "pipe",
    env: { ...process.env, npm_config_audit: "false", ...additionalEnv },
  });
  if (outcome.error || outcome.status !== 0) {
    throw new Error(executable + " " + args.slice(0, 2).join(" ") + ": " +
      String(outcome.error || outcome.stderr || outcome.stdout).slice(-3000));
  }
  return outcome.stdout || "";
}

function npmCommand(args, cwd, timeout = 180000) {
  // Native Windows Node cannot spawn .cmd wrappers with shell:false.
  // npm run sets npm_execpath to its trusted npm-cli.js, so invoke it directly.
  if (process.platform === "win32") {
    const npmCli = process.env.npm_execpath;
    if (!npmCli || !npmCli.endsWith("npm-cli.js")) {
      throw new Error("Windows upgrade runner requires npm run (npm_execpath)");
    }
    return command(process.execPath, [npmCli, ...args], cwd, timeout);
  }
  return command("npm", args, cwd, timeout);
}

function vscodeCli(executable, directory, args) {
  const [binary, ...prefix] = resolveCliArgsFromVSCodeExecutablePath(executable);
  const cliArgs = [...prefix, "--extensions-dir", directory, ...args];
  if (process.platform === "win32" && /\\code\.cmd$/i.test(binary)) {
    // @vscode/test-electron resolves a Windows .cmd shim. Node spawnSync with
    // shell:false cannot execute .cmd (EINVAL). Launch Code.exe as its own
    // Electron/Node CLI directly instead of running an unsafe cmd.exe shell.
    const appRoot = path.resolve(path.dirname(binary), "..");
    const electron = path.join(appRoot, "Code.exe");
    const cliJs = path.join(appRoot, "resources", "app", "out", "cli.js");
    assert(fs.existsSync(electron) && fs.existsSync(cliJs),
      "Installed VS Code Windows archive is missing its native CLI");
    return command(electron, [cliJs, ...cliArgs], process.cwd(), 120000,
      { ELECTRON_RUN_AS_NODE: "1" });
  }
  return command(binary, cliArgs, process.cwd());
}

function installedExtensions(executable, directory) {
  return vscodeCli(executable, directory, ["--list-extensions", "--show-versions"])
    .trim().toLowerCase();
}

function install(executable, directory, vsix) {
  vscodeCli(executable, directory, ["--install-extension", vsix, "--force"]);
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
    npmCommand(["ci", "--ignore-scripts", "--no-audit", "--no-fund"], baseline);
    npmCommand(["run", "build"], baseline);
    // Use the compiled history implementation from the actual 0.1.0 baseline,
    // not a hand-written simulation of its persistence format.
    const oldHistory = require(path.join(baseline, "out", "src", "core", "history.js"));
    const persistence = path.join(directory, "persisted-user-history");
    const legacyRun = {
      schemaVersion: 1, id: "11111111-1111-4111-8111-111111111111",
      engine: "k6", startedAt: "2026-11-07T10:00:00Z",
      endedAt: "2026-11-07T10:00:10Z",
      scenario: { id: "smoke", name: "Pre-upgrade saved history",
        target: "http://127.0.0.1:8080/", method: "GET",
        model: "constant-vus", virtualUsers: 1, durationSeconds: 10 },
      metrics: { requests: 100, requestsPerSecond: 10, failedRate: 0,
        avgMs: 2, p50Ms: 2, p95Ms: 3, p99Ms: 4, droppedIterations: 0 },
      environment: { platform: "linux", arch: "x64", node: "v22", cpuCount: 8 },
      warnings: [],
    };
    await new oldHistory.HistoryStore(persistence).save(legacyRun);
    assert.deepEqual((await new oldHistory.HistoryStore(persistence).list())[0], legacyRun);
    const oldVsix = path.join(directory, "saturivo-0.1.0.vsix");
    npmCommand(["exec", "--", "vsce", "package", "--no-dependencies", "--out", oldVsix], baseline);

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
    // Validate the unchanged user storage directory with the *new* compiled
    // implementation after VS Code has upgraded the VSIX.
    const candidateHistory = require(path.join(repo, "out", "src", "core", "history.js"));
    const stored = new candidateHistory.HistoryStore(persistence);
    const previous = await stored.list();
    assert.deepEqual(previous[0], legacyRun,
      "Existing v1 evidence must survive the installed VSIX upgrade unmodified");
    const migrated = candidateHistory.migrateImportedRun(
      JSON.parse(JSON.stringify(previous[0])));
    assert.equal(migrated.schemaVersion, 2);
    assert.deepEqual(migrated.metrics, legacyRun.metrics);
    await stored.save(migrated);
    const reloaded = await new candidateHistory.HistoryStore(persistence).list();
    assert.deepEqual(reloaded[0], migrated,
      "V2 migration must retain metrics after a fresh storage reader is created");
    assert.deepEqual(candidateHistory.migrateImportedRun(reloaded[0]), migrated);
    assert.equal(await stored.clear(), 1);
    assert.deepEqual(await new candidateHistory.HistoryStore(persistence).list(), []);
    console.log("0.1.0 persisted history -> 0.2.0 migration and reload/delete: PASS (storage-level, not VS Code dialog E2E)");
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
