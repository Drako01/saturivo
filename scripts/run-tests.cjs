"use strict";
const { readdirSync } = require("node:fs");
const { join } = require("node:path");
const { spawnSync } = require("node:child_process");
const folder = join("out", "test");
const tests = readdirSync(folder).filter(name => name.endsWith(".test.js"))
  .map(name => join(folder, name)).sort();
if (!tests.length) throw new Error("No compiled JavaScript tests found");
const child = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit", shell: false });
if (child.error) throw child.error;
process.exit(child.status ?? 1);
