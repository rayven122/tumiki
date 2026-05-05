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

  describe("claude-code", () => {
    test("macOS: ~/.claude.json を返す", () => {
      const result = resolveConfigPath("claude-code", {
        platform: "darwin",
        homedir: "/Users/test",
        appData: undefined,
      });
      expect(result).toStrictEqual("/Users/test/.claude.json");
    });

    test("Linux: ~/.claude.json を返す", () => {
      const result = resolveConfigPath("claude-code", {
        platform: "linux",
        homedir: "/home/test",
        appData: undefined,
      });
      expect(result).toStrictEqual("/home/test/.claude.json");
    });

    test("Windows: ~/.claude.json を返す", () => {
      const result = resolveConfigPath("claude-code", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: undefined,
      });
      expect(result).toStrictEqual("C:\\Users\\test/.claude.json");
    });
  });

  describe("windsurf", () => {
    test("macOS: ~/.codeium/windsurf/mcp_config.json を返す", () => {
      const result = resolveConfigPath("windsurf", {
        platform: "darwin",
        homedir: "/Users/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/Users/test/.codeium/windsurf/mcp_config.json",
      );
    });

    test("Linux: ~/.codeium/windsurf/mcp_config.json を返す", () => {
      const result = resolveConfigPath("windsurf", {
        platform: "linux",
        homedir: "/home/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/home/test/.codeium/windsurf/mcp_config.json",
      );
    });

    test("Windows: ~/.codeium/windsurf/mcp_config.json を返す", () => {
      const result = resolveConfigPath("windsurf", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "C:\\Users\\test/.codeium/windsurf/mcp_config.json",
      );
    });
  });

  describe("cline", () => {
    test("macOS: VS Code globalStorage 配下を返す", () => {
      const result = resolveConfigPath("cline", {
        platform: "darwin",
        homedir: "/Users/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/Users/test/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
      );
    });

    test("Windows: APPDATA/Code/User/globalStorage 配下を返す", () => {
      const result = resolveConfigPath("cline", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: "C:\\Users\\test\\AppData\\Roaming",
      });
      expect(result).toStrictEqual(
        "C:\\Users\\test\\AppData\\Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
      );
    });

    test("Linux: ~/.config/Code/User/globalStorage 配下を返す", () => {
      const result = resolveConfigPath("cline", {
        platform: "linux",
        homedir: "/home/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/home/test/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
      );
    });

    test("Windows で APPDATA が無い場合 null を返す", () => {
      const result = resolveConfigPath("cline", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: undefined,
      });
      expect(result).toBeNull();
    });
  });

  describe("roo-code", () => {
    test("macOS: VS Code globalStorage 配下を返す", () => {
      const result = resolveConfigPath("roo-code", {
        platform: "darwin",
        homedir: "/Users/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/Users/test/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json",
      );
    });

    test("Windows: APPDATA/Code/User/globalStorage 配下を返す", () => {
      const result = resolveConfigPath("roo-code", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: "C:\\Users\\test\\AppData\\Roaming",
      });
      expect(result).toStrictEqual(
        "C:\\Users\\test\\AppData\\Roaming/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json",
      );
    });

    test("Linux: ~/.config/Code/User/globalStorage 配下を返す", () => {
      const result = resolveConfigPath("roo-code", {
        platform: "linux",
        homedir: "/home/test",
        appData: undefined,
      });
      expect(result).toStrictEqual(
        "/home/test/.config/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json",
      );
    });

    test("Windows で APPDATA が無い場合 null を返す", () => {
      const result = resolveConfigPath("roo-code", {
        platform: "win32",
        homedir: "C:\\Users\\test",
        appData: undefined,
      });
      expect(result).toBeNull();
    });
  });
});
