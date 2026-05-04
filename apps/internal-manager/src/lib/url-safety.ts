import { lookup } from "node:dns/promises";

const localEndpointHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const normalizeIpv6Hostname = (hostname: string): string =>
  hostname.startsWith("[") && hostname.endsWith("]")
    ? hostname.slice(1, -1).toLowerCase()
    : hostname.toLowerCase();

const isPrivateIpv6Address = (hostname: string): boolean => {
  const normalizedHostname = normalizeIpv6Hostname(hostname);
  if (!normalizedHostname.includes(":")) return false;

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
  if (hostname.includes(":") || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return true;
  }

  try {
    const addresses = await lookup(hostname, { all: true });
    return addresses.every((address) => !isPrivateIpAddress(address.address));
  } catch {
    return false;
  }
};
