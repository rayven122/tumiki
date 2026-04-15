import { mkdirSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import {
  pickNewestBridgePath,
  resolveBridgeFilePath,
} from "../bridge-resolve.js";

const validJson = (): string =>
  JSON.stringify({ host: "127.0.0.1", port: 1, updatedAt: "" });

describe("pickNewestBridgePath", () => {
  test("returns null for empty list", () => {
    expect(pickNewestBridgePath([])).toBeNull();
  });

  test("returns the only path", () => {
    const dir = join(tmpdir(), `bridge-one-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "a.json");
    writeFileSync(p, validJson());
    expect(pickNewestBridgePath([p])).toBe(p);
  });

  test("picks newer mtime when two paths", () => {
    const dir = join(tmpdir(), `bridge-two-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const older = join(dir, "older.json");
    const newer = join(dir, "newer.json");
    writeFileSync(older, validJson());
    writeFileSync(newer, validJson());
    const tOld = new Date(Date.now() - 60_000);
    const tNew = new Date();
    utimesSync(older, tOld, tOld);
    utimesSync(newer, tNew, tNew);
    expect(pickNewestBridgePath([older, newer])).toBe(newer);
  });
});

describe("resolveBridgeFilePath", () => {
  test("uses argv when valid", () => {
    const p = join(tmpdir(), `arg-${Date.now()}.json`);
    writeFileSync(p, validJson());
    expect(resolveBridgeFilePath(p)).toEqual({ path: p, source: "argv" });
  });

  test("returns null for invalid argv path", () => {
    expect(resolveBridgeFilePath("/nonexistent/mcp-bridge.json")).toBeNull();
  });

  test("uses TUMIKI_MCP_BRIDGE_FILE when argv empty", () => {
    const p = join(tmpdir(), `env-${Date.now()}.json`);
    writeFileSync(p, validJson());
    const prev = process.env.TUMIKI_MCP_BRIDGE_FILE;
    process.env.TUMIKI_MCP_BRIDGE_FILE = p;
    try {
      expect(resolveBridgeFilePath(undefined)).toEqual({
        path: p,
        source: "env",
      });
    } finally {
      process.env.TUMIKI_MCP_BRIDGE_FILE = prev;
    }
  });

  test("argv wins over env", () => {
    const envPath = join(tmpdir(), `env2-${Date.now()}.json`);
    const argvPath = join(tmpdir(), `argv2-${Date.now()}.json`);
    writeFileSync(envPath, validJson());
    writeFileSync(argvPath, validJson());
    const prev = process.env.TUMIKI_MCP_BRIDGE_FILE;
    process.env.TUMIKI_MCP_BRIDGE_FILE = envPath;
    try {
      expect(resolveBridgeFilePath(argvPath)).toEqual({
        path: argvPath,
        source: "argv",
      });
    } finally {
      process.env.TUMIKI_MCP_BRIDGE_FILE = prev;
    }
  });
});
