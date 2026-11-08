"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const en = JSON.parse(fs.readFileSync("package.nls.json", "utf8"));
const es = JSON.parse(fs.readFileSync("package.nls.es.json", "utf8"));
assert.equal(pkg.publisher, "armotusitio");
assert.equal(pkg.name, "saturivo");
assert.equal(pkg.version, "0.2.1", "Candidate manifest must target 0.2.1");
assert.equal(Object.prototype.hasOwnProperty.call(pkg, "preview"), false,
  "Production-version manifest must not carry a preview label");
assert(Array.isArray(pkg.keywords) && pkg.keywords.length >= 8 && pkg.keywords.length <= 30,
  "Marketplace keywords must be specific and respect the 30-tag maximum");
assert.equal(new Set(pkg.keywords).size, pkg.keywords.length, "Marketplace keywords must be unique");
for (const keyword of ["load testing", "k6", "concurrency", "race detector", "pprof",
  "websocket testing", "regression testing"]) {
  assert(pkg.keywords.includes(keyword), "Missing supported discovery keyword: " + keyword);
}

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
assert.equal(lock.version, pkg.version, "Root lockfile version must match the manifest");
assert.equal(lock.packages[""].version, pkg.version,
  "Lockfile root package must match the manifest");
assert.equal(pkg.main, "./out/src/extension.js");
assert.equal(pkg.capabilities.untrustedWorkspaces.supported, false);
assert.equal(pkg.capabilities.virtualWorkspaces.supported, false);
assert.deepEqual(Object.keys(en).sort(), Object.keys(es).sort());
const commands = pkg.contributes.commands.map(x => x.command);
assert.equal(new Set(commands).size, commands.length);
assert(commands.includes("saturivo.cancel"));
assert(fs.existsSync("media/activity.svg"));
assert.equal(pkg.icon, "media/saturivo-icon.png");
const icon = fs.readFileSync(pkg.icon);
assert(icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Marketplace icon must be PNG");
require("./verify-icon-alpha.cjs").verifyCornersTransparent(icon);
const readme = fs.readFileSync("README.md", "utf8");
assert(readme.includes("media/saturivo-icon.png"), "README image must match package PNG");
assert(!/<img\s[^>]*src=["\x27][^"\x27]*\.svg/i.test(readme), "vsce forbids SVG images in README");
assert(fs.existsSync("out/src/extension.js"), "Extension must be compiled before manifest check");
console.log("Saturivo manifest smoke: PASS");
