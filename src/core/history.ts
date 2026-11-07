import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { RunResult } from "./types";

function looksLikeRun(value: unknown): value is RunResult {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<RunResult>;
  return data.schemaVersion === 1 && typeof data.id === "string" &&
    typeof data.startedAt === "string" && data.engine === "k6" &&
    !!data.scenario && !!data.metrics && !!data.environment;
}

export class HistoryStore {
  private readonly directory: string;
  constructor(baseDir: string) { this.directory = join(baseDir, "runs"); }

  async save(run: RunResult): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const name = run.startedAt.replace(/[^0-9]/g, "") + "-" + run.id + ".json";
    const target = join(this.directory, name);
    const temporary = join(this.directory, randomUUID() + ".tmp");
    await writeFile(temporary, JSON.stringify(run, null, 2), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, target);
  }

  async list(limit = 30): Promise<RunResult[]> {
    await mkdir(this.directory, { recursive: true });
    const filenames = (await readdir(this.directory))
      .filter(name => /^[0-9]+-[0-9a-f-]+\.json$/.test(name))
      .sort().reverse().slice(0, 100);
    const runs: RunResult[] = [];
    for (const name of filenames) {
      try {
        const content = await readFile(join(this.directory, name), "utf8");
        if (Buffer.byteLength(content) > 100_000) continue;
        const value: unknown = JSON.parse(content);
        if (looksLikeRun(value)) runs.push(value);
        if (runs.length >= limit) break;
      } catch { /* Ignore corrupt or incomplete local reports. */ }
    }
    return runs;
  }
}
