import { readFileSync } from "node:fs";
import { resolve } from "node:path";
/** The installed VSIX manifest is the authoritative source of version metadata. */
export function saturivoVersion(): string {
  const pkg: unknown = JSON.parse(readFileSync(resolve(__dirname, "../../../package.json"), "utf8"));
  const version = (pkg as { version?: unknown }).version;
  if (typeof version !== "string" || !/^[0-9]+[.][0-9]+[.][0-9]+$/.test(version)) {
    throw new Error("Invalid packaged Saturivo version");
  }
  return version;
}
