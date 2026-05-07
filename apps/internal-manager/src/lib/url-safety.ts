import { lookup } from "node:dns/promises";

const DNS_LOOKUP_TIMEOUT_MS = 3_000;
const localEndpointHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const normalizeIpv6Hostname = (hostname: string): string =>
  hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1).toLowerCase()
    : hostname.toLowerCase();

const isPrivateMappedIpv4Address = (value: string): boolean => {
  if (value.includes(".")) return isPrivateIpv4Address(value);

  const [high, low] = value.split(":");
  if (!high || !low) return false;
  const highValue = Number.parseInt(high, 16);
  const lowValue = Number.parseInt(low, 16);
  if (
    !Number.isInteger(highValue) ||
    !Number.isInteger(lowValue) ||
    highValue < 0 ||
    highValue > 0xffff ||
    lowValue < 0 ||
    lowValue > 0xffff
  ) {
    return false;
  }

  const ipv4Value = highValue * 0x10000 + lowValue;
  const mappedIpv4Address = [
    (ipv4Value >>> 24) & 0xff,
    (ipv4Value >>> 16) & 0xff,
    (ipv4Value >>> 8) & 0xff,
    ipv4Value & 0xff,
  ].join(".");
  return isPrivateIpv4Address(mappedIpv4Address);
};

const isPrivateIpv6Address = (hostname: string): boolean => {
  const normalizedHostname = normalizeIpv6Hostname(hostname);
  if (!normalizedHostname.includes(":")) return false;

  const mappedIpv4Address = normalizedHostname.startsWith("::ffff:")
    ? normalizedHostname.slice("::ffff:".length)
    : normalizedHostname.startsWith("0:0:0:0:0:ffff:")
      ? normalizedHostname.slice("0:0:0:0:0:ffff:".length)
      : null;
  if (mappedIpv4Address && isPrivateMappedIpv4Address(mappedIpv4Address)) {
    return true;
  }

  return (
    normalizedHostname === "::1" ||
    normalizedHostname.startsWith("fc") ||
    normalizedHostname.startsWith("fd") ||
    normalizedHostname.startsWith("fe8") ||
    normalizedHostname.startsWith("fe9") ||
    normalizedHostname.startsWith("fea") ||
    normalizedHostname.startsWith("feb")
  );
};

const isPrivateIpv4Address = (hostname: string): boolean => {
  const parts = hostname.split(".").map((part) => Number(part));
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const first = parts[0] ?? -1;
  const second = parts[1] ?? -1;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 192 && second === 0 && parts[2] === 2) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && parts[2] === 100) ||
    (first === 203 && second === 0 && parts[2] === 113)
  );
};

const isLocalHostname = (hostname: string): boolean =>
  localEndpointHosts.has(hostname);

const isPrivateIpAddress = (hostname: string): boolean =>
  isPrivateIpv4Address(hostname) || isPrivateIpv6Address(hostname);

const lookupWithTimeout = async (hostname: string) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      lookup(hostname, { all: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("DNS lookup timed out")),
          DNS_LOOKUP_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const isHttpUrl = (value: string): boolean => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

export const isLocalOrPublicHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (isLocalHostname(url.hostname)) return true;
    return !isPrivateIpAddress(url.hostname);
  } catch {
    return false;
  }
};

export const isResolvedLocalOrPublicHttpUrl = async (
  value: string,
): Promise<boolean> => {
  if (!isLocalOrPublicHttpUrl(value)) return false;

  const hostname = new URL(value).hostname;
  if (isLocalHostname(hostname)) return true;
  // isLocalOrPublicHttpUrlで既に検証済みだが、直接IPは念のため再検証する。
  if (hostname.includes(":")) {
    return !isPrivateIpv6Address(hostname);
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return !isPrivateIpv4Address(hostname);
  }

  try {
    // DNS解決後チェックはDNSリバインディングを完全には防げないため、
    // 本番環境ではegress制限との二重防御を前提にする。
    const addresses = await lookupWithTimeout(hostname);
    return addresses.every((address) => !isPrivateIpAddress(address.address));
  } catch {
    return false;
  }
};
