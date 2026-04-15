/**
 * Resolve mcp-bridge.json: explicit path / env, else common Electron userData locations.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const MACOS_AS = join("Library", "Application Support");

/**
 * Electron userData-relative segments (search order).
 * Scoped package "@tumiki/desktop" becomes …/@tumiki/desktop/ on disk (two folders).
 */
const USERDATA_SEGMENT_GROUPS = [
  ["Tumiki"],
  ["@tumiki", "desktop"],
  ["tumiki-desktop"],
  ["Electron"],
] as const;

const parseBridgeJson = (
  raw: string,
): { host: string; port: number } | null => {
  try {
    const j = JSON.parse(raw) as { host?: unknown; port?: unknown };
    if (typeof j.host !== "string" || typeof j.port !== "number") {
      return null;
    }
    return { host: j.host, port: j.port };
  } catch {
    return null;
  }
};

const isValidBridgeFile = (filePath: string): boolean => {
  if (!existsSync(filePath)) return false;
  try {
    const raw = readFileSync(filePath, "utf8");
    return parseBridgeJson(raw) !== null;
  } catch {
    return false;
  }
};

/** Absolute paths to existing valid bridge files under default locations. */
export const listDefaultBridgeFilePaths = (): string[] => {
  const home = homedir();
  const plat = process.platform;
  const paths: string[] = [];

  if (plat === "darwin") {
    for (const segs of USERDATA_SEGMENT_GROUPS) {
      paths.push(join(home, MACOS_AS, ...segs, "mcp-bridge.json"));
    }
  } else if (plat === "win32") {
    const roaming = process.env.APPDATA;
    if (roaming) {
      for (const segs of USERDATA_SEGMENT_GROUPS) {
        paths.push(join(roaming, ...segs, "mcp-bridge.json"));
      }
    }
  } else {
    const config =
      process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config");
    for (const segs of USERDATA_SEGMENT_GROUPS) {
      paths.push(join(config, ...segs, "mcp-bridge.json"));
    }
  }

  return paths.filter(isValidBridgeFile);
};

/** When several defaults exist, pick newest by mtime. */
export const pickNewestBridgePath = (paths: string[]): string | null => {
  if (paths.length === 0) return null;
  if (paths.length === 1) return paths[0]!;
  let best = paths[0]!;
  let bestMtime = statSync(best).mtimeMs;
  for (let i = 1; i < paths.length; i++) {
    const p = paths[i]!;
    const m = statSync(p).mtimeMs;
    if (m > bestMtime) {
      bestMtime = m;
      best = p;
    }
  }
  return best;
};

export const resolveBridgeFilePath = (
  explicitPath: string | undefined,
): { path: string; source: "argv" | "env" | "auto" } | null => {
  const trimmedEnv = process.env.TUMIKI_MCP_BRIDGE_FILE?.trim();

  if (explicitPath?.trim()) {
    const p = explicitPath.trim();
    if (!isValidBridgeFile(p)) return null;
    return { path: p, source: "argv" };
  }

  if (trimmedEnv) {
    if (!isValidBridgeFile(trimmedEnv)) return null;
    return { path: trimmedEnv, source: "env" };
  }

  const candidates = listDefaultBridgeFilePaths();
  const picked = pickNewestBridgePath(candidates);
  if (!picked) return null;
  return { path: picked, source: "auto" };
};

export const formatDefaultSearchHint = (): string => {
  const home = homedir();
  const plat = process.platform;
  const samples: string[] = [];
  if (plat === "darwin") {
    samples.push(join(home, MACOS_AS, "Tumiki", "mcp-bridge.json"));
    samples.push(
      join(home, MACOS_AS, "@tumiki", "desktop", "mcp-bridge.json"),
    );
  } else if (plat === "win32") {
    const r = process.env.APPDATA ?? "%APPDATA%";
    samples.push(join(r, "Tumiki", "mcp-bridge.json"));
  } else {
    samples.push(
      join(
        process.env.XDG_CONFIG_HOME?.trim() || join(home, ".config"),
        "Tumiki",
        "mcp-bridge.json",
      ),
    );
  }
  return samples.join("\n  ");
};
