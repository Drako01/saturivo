import { test } from "node:test";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { raceFindingsToSarif } from "../src/core/sarif";
test("SARIF 2.1.0 exports observed race source locations only", () => {
  const report = raceFindingsToSarif([{
    file: resolve("main.go"), line: 17, access: "write" as const,
    description: "Go race detector observed a concurrent write at this source location",
  }]) as { version: string; runs: Array<{ results: Array<{ ruleId: string;
    locations: Array<{ physicalLocation: { region: { startLine: number } } }> }> }> };
  assert.equal(report.version, "2.1.0");
  assert.equal(report.runs[0]?.results[0]?.ruleId, "GO_RACE_EVIDENCE");
  assert.equal(report.runs[0]?.results[0]?.locations[0]?.physicalLocation.region.startLine, 17);
});
