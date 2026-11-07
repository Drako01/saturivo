import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

/** A single bounded subprocess. No shell, no background completion, no telemetry. */
export interface ProcessRequest {
  readonly binary: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
  readonly signal: AbortSignal;
  readonly env?: NodeJS.ProcessEnv;
}
export interface ProcessOutcome {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly truncated: boolean;
}
function terminateTree(child: ChildProcessWithoutNullStreams, force: boolean): void {
  if (child.pid === undefined) return;
  if (process.platform === "win32") {
    // Windows does not support POSIX process groups. taskkill /T handles child trees.
    const killer = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true, shell: false, stdio: "ignore",
    });
    killer.on("error", () => { try { child.kill(); } catch { /* already closed */ } });
    killer.unref();
  } else {
    try { process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM"); }
    catch { try { child.kill(force ? "SIGKILL" : "SIGTERM"); } catch { /* already closed */ } }
  }
}

export async function runBoundedProcess(request: ProcessRequest): Promise<ProcessOutcome> {
  if (request.signal.aborted) throw new Error("Cancelled");
  if (!Number.isFinite(request.timeoutMs) || request.timeoutMs < 1_000 || request.timeoutMs > 600_000) {
    throw new Error("Invalid subprocess timeout");
  }
  if (!Number.isInteger(request.maxOutputBytes) || request.maxOutputBytes < 1024 ||
    request.maxOutputBytes > 1_000_000) throw new Error("Invalid output budget");
  return await new Promise<ProcessOutcome>((resolve, reject) => {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(request.binary, [...request.args], {
        cwd: request.cwd,
        shell: false, windowsHide: true, detached: process.platform !== "win32",
        ...(request.env ? { env: request.env } : {}),
      });
    } catch (error) { reject(error); return; }
    let out = "", err = "", used = 0, truncated = false;
    let aborted = false, timedOut = false;
    let spawnError: Error | undefined;
    let closed = false;
    const append = (chunk: Buffer, which: "stdout" | "stderr"): void => {
      const remaining = request.maxOutputBytes - used;
      if (remaining <= 0) { truncated = true; return; }
      const data = chunk.subarray(0, remaining);
      if (data.byteLength < chunk.byteLength) truncated = true;
      used += data.byteLength;
      const decoded = data.toString("utf8");
      if (which === "stdout") out += decoded; else err += decoded;
    };
    child.stdout.on("data", (c: Buffer) => append(c, "stdout"));
    child.stderr.on("data", (c: Buffer) => append(c, "stderr"));
    const forceTimer = { current: undefined as NodeJS.Timeout | undefined };
    const stop = (): void => {
      if (closed) return;
      terminateTree(child, false);
      forceTimer.current = setTimeout(() => terminateTree(child, true), 2000);
      forceTimer.current.unref();
    };
    const onAbort = (): void => { aborted = true; stop(); };
    request.signal.addEventListener("abort", onAbort, { once: true });
    const timeout = setTimeout(() => { timedOut = true; stop(); }, request.timeoutMs);
    child.on("error", (error: Error) => { spawnError = error; });
    child.once("close", (code) => {
      closed = true;
      clearTimeout(timeout);
      if (forceTimer.current) clearTimeout(forceTimer.current);
      request.signal.removeEventListener("abort", onAbort);
      if (aborted || request.signal.aborted) reject(new Error("Cancelled"));
      else if (timedOut) reject(new Error("Process deadline exceeded"));
      else if (spawnError) reject(spawnError);
      else resolve({ exitCode: code ?? -1, stdout: out, stderr: err, truncated });
    });
    if (request.signal.aborted) onAbort();
  });
}
