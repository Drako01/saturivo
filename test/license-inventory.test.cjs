"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { inventory, renderMarkdown } = require("../scripts/license-inventory.cjs");

test("license inventory separates shipped and dev dependencies without invented metadata", () => {
  const result = inventory({ lockfileVersion: 3, packages: {
    "": { license: "MIT" },
    "node_modules/shipped": { version: "1.2.3", license: "Apache-2.0" },
    "node_modules/dev-only": { version: "2.0.0", license: "GPL-3.0", dev: true },
    "node_modules/unknown": { version: "0.1.0", dev: true },
  } });
  assert.equal(result.counts.production, 1);
  assert.equal(result.counts.development, 2);
  assert.equal(result.counts.unknown, 1);
  assert.equal(result.counts.requiresReview, 1);
  assert.match(renderMarkdown(result), /Apache-2\.0/);
  assert.match(renderMarkdown(result), /development/);
});
test("invalid lockfile schema does not silently claim a complete inventory", () => {
  assert.throws(() => inventory({ packages: {} }), /lock v3/);
});
