"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const pkg = require("../package.json");
const { execFileSync } = require("node:child_process");

function preflight() {
  assert(!pkg.private, "package.json private:true blocks publication; only the maintainer may authorize a release commit");
  assert(/^\d+\.\d+\.\d+$/.test(pkg.version), "Release version must be an exact semver");
  const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
  assert(changelog.includes("## [" + pkg.version + "]") &&
    !new RegExp("## \\[" + pkg.version.replaceAll(".", "\\.") + "\\].*Unreleased", "i").test(changelog),
    "Release changelog must have a final, dated version section");
  assert(fs.existsSync("LICENSE"), "License missing");
  const environment = process.env.SATURIVO_RELEASE_APPROVED;
  assert.equal(environment, "YES", "Set SATURIVO_RELEASE_APPROVED=YES only for an explicitly approved release");
  console.log("Saturivo release preflight: approved " + pkg.version);
}
try {
  preflight();
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "verify"], { stdio: "inherit" });
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx",
    ["--no-install", "vsce", "package", "--no-dependencies", "--out", "saturivo.vsix"],
    { stdio: "inherit" });
  const { audit } = require("./audit-vsix.cjs");
  audit("saturivo.vsix");
  execFileSync(process.execPath, ["scripts/vsix-checksum.cjs", "write", "saturivo.vsix"], { stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/vsix-checksum.cjs", "check", "saturivo.vsix"], { stdio: "inherit" });
} catch (error) {
  console.error("Saturivo release gate: BLOCKED — " + String(error.message ?? error));
  process.exitCode = 1;
}
