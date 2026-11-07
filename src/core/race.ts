import { isAbsolute, relative, resolve, sep } from "node:path";

export interface GoRaceFinding {
  readonly file: string;
  readonly line: number;
  readonly access: "read" | "write" | "unknown";
  readonly description: string;
}
/** Extract only observed source lines from go test -race; no speculative root cause. */
export function parseGoRaceOutput(output: string, workspace: string): GoRaceFinding[] {
  const result: GoRaceFinding[] = [];
  const seen = new Set<string>();
  let inRace = false;
  let access: GoRaceFinding["access"] = "unknown";
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.includes("WARNING: DATA RACE")) { inRace = true; access = "unknown"; continue; }
    if (!inRace) continue;
    if (line === "==================") { inRace = false; continue; }
    if (/^(Previous )?Read at /i.test(line)) access = "read";
    else if (/^(Previous )?Write at /i.test(line)) access = "write";
    const match = /^\s*(.+\.go):(\d+)(?:\s+\+0x[0-9a-fA-F]+)?\s*$/.exec(line);
    if (!match) continue;
    const original = match[1], row = Number(match[2]);
    if (!original || !Number.isSafeInteger(row) || row < 1) continue;
    const full = resolve(workspace, original);
    const rel = relative(workspace, full);
    if (!rel || rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) continue;
    const key = full + ":" + row + ":" + access;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      file: full, line: row, access,
      description: "Go race detector observed a concurrent " + access + " at this source location",
    });
    if (result.length >= 200) break;
  }
  return result;
}
