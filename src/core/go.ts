import { spawn } from "node:child_process";

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
  return await new Promise<GoOutcome>((resolve, reject) => {
    const child = spawn("go", args, {
      cwd: folder, shell: false, windowsHide: true, signal,
      env: { ...process.env, GOTOOLCHAIN: "local" },
    });
    let output = "";
    let truncated = false;
    const append = (chunk: Buffer): void => {
      if (output.length >= 200_000) { truncated = true; return; }
      output += chunk.toString("utf8").slice(0, 200_000 - output.length);
    };
    const deadline = setTimeout(() => child.kill(), 180_000);
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    child.once("error", error => { clearTimeout(deadline); reject(error); });
    child.once("close", code => {
      clearTimeout(deadline);
      if (signal.aborted) reject(new Error("Cancelled"));
      else resolve({ task, exitCode: code ?? -1, output, truncated });
    });
  });
}
