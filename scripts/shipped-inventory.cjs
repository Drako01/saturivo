"use strict";
const assert = require("node:assert/strict");
const { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } = require("node:fs");
const { builtinModules } = require("node:module");
const crypto = require("node:crypto");
const path = require("node:path");
const { filenamesFromZip } = require("./audit-vsix.cjs");

function walk(dir) {
  const items = [];
  for (const name of readdirSync(dir)) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) items.push(...walk(file));
    else if (name.endsWith(".js")) items.push(file);
  }
  return items;
}
function inventory(vsix, root = path.resolve(__dirname, "..")) {
  const metadata = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
  const entries = filenamesFromZip(vsix);
  assert(entries.includes("extension/THIRD_PARTY_NOTICES.md"),
    "Distributable MUST include third-party notices");
  assert(!entries.some(name => /^extension\/node_modules\//i.test(name)),
    "node_modules must not be shipped in the VSIX");
  const dependencyList = Object.keys(metadata.dependencies || {});
  assert.deepEqual(dependencyList, [],
    "Do not claim zero shipped npm dependencies when runtime dependencies are declared");
  const builtins = new Set(builtinModules.flatMap(name => [
    name, name.startsWith("node:") ? name.slice(5) : "node:" + name,
  ]));
  const files = walk(path.join(root, "out", "src"));
  const external = [];
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const staticRequires = [...content.matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)];
    for (const match of staticRequires) {
      const specifier = match[1];
      if (!specifier || specifier.startsWith(".") ||
          builtins.has(specifier) || specifier === "vscode") continue;
      external.push({ file: path.relative(root, file), specifier });
    }
  }
  assert.deepEqual(external, [],
    "Unexpected third-party static require in shipped compiled JavaScript: " + JSON.stringify(external));
  const checksum = crypto.createHash("sha256").update(readFileSync(vsix)).digest("hex");
  return {
    schemaVersion: 1,
    packageId: metadata.publisher + "." + metadata.name,
    version: metadata.version,
    vsixSha256: checksum,
    bundledPaths: entries,
    bundledPathCount: entries.length,
    shippedJavaScriptFiles: files.map(file => path.relative(root, file)),
    runtimeNpmDependencies: [],
    forbiddenExternalRequires: external,
    notices: "extension/THIRD_PARTY_NOTICES.md",
    caveat: "Static CommonJS requires + ZIP path inventory only. Manual notice and transitive source review required. No provenance attestation is inferred.",
  };
}
if (require.main === module) {
  try {
    const artifact = path.resolve(process.argv[2] || "saturivo.vsix");
    const result = inventory(artifact);
    const output = path.resolve(__dirname, "..", "reports", "saturivo-shipped-inventory.json");
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });
    console.log("Shipped VSIX inventory: PASS; bundledPaths=" + result.bundledPathCount +
      "; compiledJavaScript=" + result.shippedJavaScriptFiles.length +
      "; runtime npm dependencies=" + result.runtimeNpmDependencies.length);
  } catch (error) { console.error(error); process.exitCode = 1; }
}
module.exports = { inventory };
