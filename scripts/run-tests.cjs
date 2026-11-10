"use strict";
const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const folder = join("out", "test");
const tests = readdirSync(folder).filter(name => name.endsWith(".test.js"))
  .map(name => join(folder, name)).sort();
if (!tests.length) throw new Error("No compiled JavaScript tests found");
const child = spawnSync(process.execPath, ["--test", "--experimental-test-coverage", ...tests], {
  encoding: "utf8", shell: false, maxBuffer: 32 * 1024 * 1024,
});
if (child.stdout) process.stdout.write(child.stdout);
if (child.stderr) process.stderr.write(child.stderr);
if (child.error) throw child.error;
if (child.status !== 0) process.exit(child.status ?? 1);
require("./coverage-gate.cjs").enforceCoverage(child.stdout);

