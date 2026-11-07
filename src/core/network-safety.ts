import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type Resolver = (hostname: string) => Promise<readonly string[]>;

function ipv4Public(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = octets;
  if (a === undefined || b === undefined || c === undefined) return false;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || b === 0 && c === 0 || b === 0 && c === 2 || b === 88 && c === 99)) return false;
  if (a === 198 && (b === 18 || b === 19 || b === 51 && c === 100)) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

/** Fail closed on special-use, loopback, private, and documentation IP space. */
export function isPublicIp(raw: string): boolean {
  const address = raw.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(address) === 4) return ipv4Public(address);
  if (isIP(address) !== 6) return false;
  // WHATWG URL canonicalization closes zero-padded IPv6 prefix bypasses.
  // DNS library output and user-supplied literals are not guaranteed canonical.
  const canonical = new URL("http://[" + address + "]/").hostname.slice(1, -1);
  // IPv4-mapped addresses in canonical or dotted form must not bypass IPv4 rules.
  if (canonical.startsWith("::ffff:")) {
    const suffix = canonical.slice(7);
    if (isIP(suffix) === 4) return ipv4Public(suffix);
    const parts = suffix.split(":");
    if (parts.length === 2 && parts.every(part => /^[0-9a-f]{1,4}$/.test(part))) {
      const high = Number.parseInt(parts[0]!, 16), low = Number.parseInt(parts[1]!, 16);
      return ipv4Public([(high >> 8) & 255, high & 255, (low >> 8) & 255, low & 255].join("."));
    }
    return false;
  }
  // IPv6 globally routable unicast is 2000::/3. Exclude documentation prefixes.
  const [firstHex, secondHex] = canonical.split(":");
  const first = Number.parseInt(firstHex ?? "", 16);
  const second = Number.parseInt(secondHex || "0", 16);
  if (!Number.isFinite(first) || first < 0x2000 || first > 0x3fff) return false;
  // 2001::/23 contains Teredo, ORCHID and special-purpose transition ranges;
  // 2002::/16 (6to4) can tunnel to private IPv4 addresses.
  // 2001:db8::/32 is documentation space; 3ffe::/16 is deprecated 6bone.
  if (first === 0x2001 && (second <= 0x01ff || second === 0x0db8)) return false;
  if (first === 0x2002 || first === 0x3ffe) return false;
  return true;
}

const defaultResolver: Resolver = async hostname => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map(record => record.address);
};

/**
 * Pins an explicitly approved remote DNS name to the verified public IP.
 * Any private/special-use DNS answer rejects the entire attempt, even when
 * remote loading was enabled. No redirects or proxies are permitted by k6.
 */
export async function pinnedTargetHosts(
  raw: string, signal: AbortSignal, resolver: Resolver = defaultResolver
): Promise<Readonly<Record<string, string>>> {
  if (signal.aborted) throw new Error("Cancelled");
  const url = new URL(raw);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host.toLowerCase() === "localhost" || host.toLowerCase() === "localhost.") {
    return { localhost: "127.0.0.1", "localhost.": "127.0.0.1" };
  }
  if (isIP(host)) {
    if (host === "::1" || /^127\./.test(host)) return {};
    if (!isPublicIp(host)) throw new Error("Private or special-use remote IP is prohibited");
    return {};
  }

  let abortHandler: (() => void) | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const answers = await Promise.race([
      resolver(host),
      new Promise<never>((_resolve, reject) => {
        abortHandler = () => reject(new Error("Cancelled"));
        signal.addEventListener("abort", abortHandler!, { once: true });
        timeout = setTimeout(() => reject(new Error("Target DNS deadline exceeded")), 5000);
      }),
    ]);
    if (signal.aborted) throw new Error("Cancelled");
    if (answers.length < 1 || answers.length > 16 || answers.some(value => !isPublicIp(value))) {
      throw new Error("Remote DNS contains private, special-use or invalid addresses");
    }
    // k6 hosts option prevents a second hostname lookup / DNS rebinding.
    return { [host]: answers[0]! };
  } finally {
    if (timeout) clearTimeout(timeout);
    if (abortHandler) signal.removeEventListener("abort", abortHandler);
  }
}
