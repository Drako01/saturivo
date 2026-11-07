import { open } from "node:fs/promises";

export type RuntimeKind = "node" | "java" | "python";
export interface RuntimeSnapshot {
  readonly runtime: RuntimeKind;
  readonly pid: number;
  readonly status: "SUPPORTED" | "NOT_SUPPORTED";
  readonly rssBytes?: number;
  readonly threads?: number;
  readonly observation?: string;
  readonly reason?: string;
  readonly availableArtifacts: readonly string[];
}

const names: Readonly<Record<RuntimeKind, RegExp>> = {
  node: /^node(?:js)?$/i,
  java: /^java(?:[0-9]+)?$/i,
  python: /^python(?:[0-9]+(?:\.[0-9]+)?)?$/i,
};

function integer(raw: string | undefined): number | undefined {
  if (!raw || !/^[0-9]+$/.test(raw)) return undefined;
  const number = Number(raw);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

/** A bounded /proc status parser; never returns cmdline, env, code, or secrets. */
export function parseProcessStatus(runtime: RuntimeKind, pid: number, raw: string): RuntimeSnapshot {
  if (!Number.isInteger(pid) || pid < 1 || pid > 4_194_304) throw new Error("Invalid process ID");
  if (!(runtime in names)) throw new Error("Unsupported runtime identifier");
  const fields = new Map<string, string>();
  for (const line of raw.slice(0, 65536).split(/\r?\n/)) {
    const entry = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (entry) fields.set(entry[1]!, entry[2]!);
  }
  const processName = fields.get("Name")?.trim() ?? "";
  if (!names[runtime].test(processName)) {
    return { runtime, pid, status: "NOT_SUPPORTED",
      reason: "Process executable does not match the selected runtime",
      availableArtifacts: [] };
  }
  const rssKiB = integer(/^(\d+)\s+kB$/.exec(fields.get("VmRSS") ?? "")?.[1]);
  const threads = integer(fields.get("Threads"));
  if (rssKiB === undefined || threads === undefined || threads < 1) {
    return { runtime, pid, status: "NOT_SUPPORTED",
      reason: "Process RSS or thread counts are unavailable",
      availableArtifacts: [] };
  }
  return {
    runtime, pid, status: "SUPPORTED", rssBytes: rssKiB * 1024, threads,
    observation: "Local Linux procfs snapshot; not heap profiling or a CPU benchmark",
    availableArtifacts: [],
  };
}

/** Explicit read-only process adapter: Linux only, exact selected PID, 64 KiB cap. */
export async function readRuntimeSnapshot(runtime: RuntimeKind, pid: number): Promise<RuntimeSnapshot> {
  if (!Number.isInteger(pid) || pid < 1 || pid > 4_194_304) {
    throw new Error("Invalid process ID");
  }
  if (!(runtime in names)) throw new Error("Unsupported runtime identifier");
  if (process.platform !== "linux") {
    return { runtime, pid, status: "NOT_SUPPORTED",
      reason: "Runtime process metrics require local Linux procfs on this version",
      availableArtifacts: [] };
  }
  const file = await open("/proc/" + pid + "/status", "r").catch(() => undefined);
  if (!file) {
    return { runtime, pid, status: "NOT_SUPPORTED",
      reason: "The selected process is not accessible or no longer exists",
      availableArtifacts: [] };
  }
  const buffer = Buffer.alloc(65536);
  try {
    const read = await file.read(buffer, 0, buffer.byteLength, 0);
    return parseProcessStatus(runtime, pid, buffer.subarray(0, read.bytesRead).toString("utf8"));
  } finally { await file.close(); }
}
