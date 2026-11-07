"use strict";
const { readFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

/** Deterministic license inventory from the pinned npm lockfile. */
function inventory(lock) {
  if (!lock || lock.lockfileVersion !== 3 || !lock.packages || typeof lock.packages !== "object") {
    throw new Error("Expected a package-lock v3 dependency graph");
  }
  const entries = Object.entries(lock.packages)
    .filter(([key]) => key.startsWith("node_modules/"))
    .map(([key, value]) => ({
      name: key.slice(key.lastIndexOf("node_modules/") + 13),
      version: String(value.version || "unknown"),
      license: String(value.license || "UNKNOWN"),
      scope: value.dev ? "development" : "production",
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
  const unknown = entries.filter(x => x.license === "UNKNOWN");
  const review = entries.filter(x => /\b(?:A?GPL|SSPL|BUSL)\b/i.test(x.license));
  return {
    schemaVersion: 1,
    source: "package-lock.json",
    counts: {
      production: entries.filter(x => x.scope === "production").length,
      development: entries.filter(x => x.scope === "development").length,
      unknown: unknown.length, requiresReview: review.length,
    },
    review: review.map(x => x.name + "@" + x.version + " " + x.license),
    unknown: unknown.map(x => x.name + "@" + x.version),
    entries,
  };
}

function renderMarkdown(data) {
  return [
    "# Saturivo — npm dependency license inventory", "",
    "Generated from the exact pinned npm lockfile.", "",
    "Production packages: **" + data.counts.production + "**; development packages: **" +
      data.counts.development + "**.", "",
    "Unknown licenses: **" + data.counts.unknown + "**; manual review flags: **" +
      data.counts.requiresReview + "**.", "",
    "This is a dependency license inventory, not a legal opinion or packaged-file manifest.", "",
    "| Dependency | Version | Scope | License |", "|---|---|---|---|",
    ...data.entries.map(x => "| " + x.name.replaceAll("|", "\\|") +
      " | " + x.version + " | " + x.scope + " | " + x.license.replaceAll("|", "\\|") + " |"),
    "",
  ].join("\n");
}
if (require.main === module) {
  const data = inventory(JSON.parse(readFileSync(join(__dirname, "..", "package-lock.json"), "utf8")));
  const dir = join(__dirname, "..", "reports");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "saturivo-licenses.json"), JSON.stringify(data, null, 2) + "\n");
  writeFileSync(join(dir, "saturivo-licenses.md"), renderMarkdown(data));
  console.log("License inventory: production=" + data.counts.production +
    " dev=" + data.counts.development + " review=" + data.counts.requiresReview +
    " unknown=" + data.counts.unknown);
}
module.exports = { inventory, renderMarkdown };
