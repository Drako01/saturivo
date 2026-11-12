"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
test("release documentation version matches packaged source, no stale unpublished 0.2.0 claims", () => {
  const pkg = require("../package.json");
  const status = fs.readFileSync("STATUS.md", "utf8");
  const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
  const readme = fs.readFileSync("README.md", "utf8");
  assert(status.includes(pkg.version), "STATUS.md needs the current source version");
  assert(changelog.includes("## [" + pkg.version + "] — "), "CHANGELOG missing candidate version");
  assert(readme.includes("Saturivo " + pkg.version), "README version drift");
  assert.doesNotMatch(status, /PR #5 Ready for review|sin Marketplace ni Open VSX/);
  assert.match(status, /NO PUBLICADO/);
  assert.match(readme, /Check setup/);
  assert.match(readme, /0\.3\.1.*published|published.*0\.3\.1/i);
  assert.doesNotMatch(readme, /latest GitHub Release remains v0\.2\.2/i);
  assert.match(fs.readFileSync("docs/README_ES.md", "utf8"), /Verificar instalación/);
});
