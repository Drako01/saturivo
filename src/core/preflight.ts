import { mkdir } from "node:fs/promises";
import { runBoundedProcess } from "./process";
import { CancelledError } from "./cancelled-error";

export interface ToolStatus { readonly available: boolean; readonly version?: string }
export interface ToolchainStatus { readonly k6: ToolStatus; readonly go: ToolStatus }

/** Version-only check; never connects to configured targets or runs project code. */
export async function probeLocalBinary(
  binary: string, args: readonly string[], cwd: string, signal: AbortSignal
): Promise<ToolStatus> {
  if (signal.aborted) throw new CancelledError();
  try {
    const result = await runBoundedProcess({
      binary, args, cwd, signal, timeoutMs: 5000, maxOutputBytes: 2048,
      env: { PATH: process.env.PATH, Path: process.env.Path,
        HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE,
        SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP,
        TMP: process.env.TMP, TMPDIR: process.env.TMPDIR,
        K6_NO_USAGE_REPORT: "true" },
    });
    if (signal.aborted) throw new CancelledError();
    if (result.exitCode !== 0) return { available: false };
    const version = (result.stdout + "\n" + result.stderr).split(/\r?\n/)
      .map(line => line.trim()).find(Boolean)?.slice(0, 160);
    return { available: true, ...(version ? { version } : {}) };
  } catch (error) {
    if (signal.aborted || error instanceof CancelledError) throw new CancelledError();
    return { available: false };
  }
}

export async function checkLocalToolchain(
  k6Binary: string, storageDir: string, signal: AbortSignal
): Promise<ToolchainStatus> {
  if (signal.aborted) throw new CancelledError();
  await mkdir(storageDir, { recursive: true });
  return {
    k6: await probeLocalBinary(k6Binary, ["version"], storageDir, signal),
    go: await probeLocalBinary("go", ["version"], storageDir, signal),
  };
}
