/** Show a target without leaking URL query parameters or fragments. */
export function redactTargetForDisplay(raw: string): string {
  const positions = [raw.indexOf("?"), raw.indexOf("#")].filter(position => position >= 0);
  return positions.length
    ? raw.slice(0, Math.min(...positions)) + " [query redacted]"
    : raw;
}
