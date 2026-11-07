import { mkdir, readdir, readFile, rename, writeFile, unlink } from "node:fs/promises";
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
    await this.prune(100);
  }

  private async ownedFiles(): Promise<string[]> {
    await mkdir(this.directory, { recursive: true });
    return (await readdir(this.directory))
      .filter(name => /^[0-9]+-[0-9a-f-]+\.json$/.test(name))
      .sort().reverse();
  }

  async prune(keep: number): Promise<number> {
    if (!Number.isInteger(keep) || keep < 1 || keep > 1000) throw new Error("Invalid history retention");
    const files = await this.ownedFiles();
    let deleted = 0;
    for (const name of files.slice(keep)) {
      await unlink(join(this.directory, name));
      deleted++;
    }
    return deleted;
  }

  async clear(): Promise<number> {
    const files = await this.ownedFiles();
    for (const name of files) await unlink(join(this.directory, name));
    return files.length;
  }

  async list(limit = 30): Promise<RunResult[]> {
    const filenames = (await this.ownedFiles()).slice(0, 100);
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
