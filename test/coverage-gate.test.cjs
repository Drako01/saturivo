"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { coverageRows } = require("../scripts/coverage-gate.cjs");

test("Node coverage table is parsed with hierarchy, not incidental test filenames", () => {
  const output = [
    "# start of coverage report",
    "# file             | line % | branch % | funcs % | uncovered lines",
    "#  out             |        |          |         |",
    "#   src            |        |          |         |",
    "#    core          |        |          |         |",
    "#     k6.js        |  83.25 |    80.00 |   90.00 | 10-11",
    "#    run-lifecycle.js | 100.00 | 100.00 | 100.00 |",
    "# end of coverage report",
  ].join("\n");
  assert.deepEqual(coverageRows(output), [
    {path:"out/src/core/k6.js",lines:83.25},
    {path:"out/src/run-lifecycle.js",lines:100},
  ]);
});
