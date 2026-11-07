import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";

/**
 * Read exactly one ordinary file via its stable descriptor, never a followed
 * symlink or hardlink. The byte bound is enforced during reads, not just by
 * pre-open stat (writers could grow the file concurrently).
 */
export async function readBoundedRegularTextFile(
  file: string, maxBytes: number
): Promise<string> {
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || maxBytes > 4_000_000) {
    throw new Error("Invalid bounded-file size limit");
  }
  const before = await lstat(file);
  if (!before.isFile() || before.nlink !== 1) {
    throw new Error("Expected a single-link regular file");
  }
  if (before.size > maxBytes) throw new Error("File exceeds size limit");
  // O_NOFOLLOW rejects a link inserted between lstat and open on POSIX.
  // Windows uses the pre-open identity and post-open file identity checks.
  const flags = constants.O_RDONLY | (process.platform === "win32" ? 0 : constants.O_NOFOLLOW);
  const handle = await open(file, flags);
  try {
    const current = await handle.stat();
    if (!current.isFile() || current.nlink !== 1 ||
        current.dev !== before.dev || current.ino !== before.ino) {
      throw new Error("File identity changed or is not a single-link regular file");
    }
    if (current.size > maxBytes) throw new Error("File exceeds size limit");
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (bytes <= maxBytes) {
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1 - bytes));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, bytes);
      if (bytesRead === 0) break;
      bytes += bytesRead;
      if (bytes > maxBytes) throw new Error("File exceeds size limit");
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks, bytes).toString("utf8");
  } finally {
    await handle.close();
  }
}
