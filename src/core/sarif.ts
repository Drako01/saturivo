import { pathToFileURL } from "node:url";
import type { GoRaceFinding } from "./race";
export function raceFindingsToSarif(findings: readonly GoRaceFinding[]): unknown {
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{
      tool: { driver: { name: "Saturivo", version: "0.1.0", rules: [{
        id: "GO_RACE_EVIDENCE", name: "GoRuntimeRace",
        shortDescription: { text: "Observed Go runtime race detector evidence" },
        help: { text: "Re-run go test -race under representative tests to reproduce this observed access." },
      }] } },
      results: findings.map(finding => ({
        ruleId: "GO_RACE_EVIDENCE", level: "warning",
        message: { text: finding.description },
        locations: [{ physicalLocation: {
          artifactLocation: { uri: pathToFileURL(finding.file).href },
          region: { startLine: finding.line },
        } }],
      })),
    }],
  };
}
