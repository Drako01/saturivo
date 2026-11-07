import { runBoundedProcess } from "./process";

export type GoTask = "race" | "benchmark";

export interface GoOutcome {
  readonly task: GoTask;
  readonly exitCode: number;
  readonly output: string;
  readonly truncated: boolean;
}

export async function runGo(task: GoTask, folder: string, signal: AbortSignal): Promise<GoOutcome> {
  const args = task === "race" ? ["test", "-race", "./..."] :
    ["test", "-run", "^$", "-bench", ".", "-benchmem", "./..."];
  const result = await runBoundedProcess({
    binary: "go", args, cwd: folder, signal,
    timeoutMs: 180_000, maxOutputBytes: 200_000,
    env: { ...process.env, GOTOOLCHAIN: "local" },
  });
  return {
    task, exitCode: result.exitCode,
    output: result.stdout + result.stderr,
    truncated: result.truncated,
  };
}
