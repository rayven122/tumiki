import { describe, test, expect } from "vitest";
import { resolveConfigPath } from "../resolve-config-path";

describe("resolveConfigPath", () => {
  describe("claude-desktop", () => {
    test("macOS: Library/Application Support 配下を返す", () => {
      const result = resolveConfigPath("claude-desktop", {
        platform: "darwin",
        homedir: "/Users/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/Users/test/Library/Application Support/Claude/claude_desktop_config.json",
      );
    });

    test("Windows: APPDATA 配下を返す", () => {
      const result = resolveConfigPath("claude-desktop", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: "C:\\Users\\test\\AppData\\Roaming",
      });
      expect(result).toStrictEqual(
        "C:\\Users\\test\\AppData\\Roaming/Claude/claude_desktop_config.json",
      );
    });

    test("Windows で APPDATA が無い場合 null を返す", () => {
      const result = resolveConfigPath("claude-desktop", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: undefined,
      });
      expect(result).toBeNull();
    });

    test("Linux は公式サポート無しのため null を返す", () => {
      const result = resolveConfigPath("claude-desktop", {
        platform: "linux",
        homedir: "/home/test",
        appData: undefined,
      });
      expect(result).toBeNull();
    });
  });

  describe("cursor", () => {
    test("macOS: ~/.cursor/mcp.json を返す", () => {
      const result = resolveConfigPath("cursor", {
        platform: "darwin",
        homedir: "/Users/test",
        appData: undefined,
      });
      expect(result).toStrictEqual("/Users/test/.cursor/mcp.json");
    });

    test("Linux: ~/.cursor/mcp.json を返す", () => {
      const result = resolveConfigPath("cursor", {
        platform: "linux",
        homedir: "/home/test",
        appData: undefined,
      });
      expect(result).toStrictEqual("/home/test/.cursor/mcp.json");
    });

    test("Windows: ~/.cursor/mcp.json を返す", () => {
      const result = resolveConfigPath("cursor", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: undefined,
      });
      expect(result).toStrictEqual("C:\\Users\\test/.cursor/mcp.json");
    });
  });
});
