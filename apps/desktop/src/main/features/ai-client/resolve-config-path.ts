import os from "node:os";
import path from "node:path";

export type SupportedAiClientId =
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "windsurf"
  | "cline"
  | "roo-code"
  | "gemini-cli"
  | "vscode"
  | "zed";

export type ResolveConfigPathContext = {
  platform: NodeJS.Platform;
  homedir: string;
  appData: string | undefined;
};

export const resolveConfigPath = (
  clientId: SupportedAiClientId,
  ctx: ResolveConfigPathContext = {
    platform: process.platform,
    homedir: os.homedir(),
    appData: process.env.APPDATA,
  },
): string | null => {
  switch (clientId) {
    case "claude-desktop":
      return resolveClaudeDesktop(ctx);
    case "claude-code":
      return resolveClaudeCode(ctx);
    case "cursor":
      return resolveCursor(ctx);
    case "windsurf":
      return resolveWindsurf(ctx);
    case "cline":
      return resolveVsCodeExtensionMcp(
        ctx,
        "saoudrizwan.claude-dev",
        "cline_mcp_settings.json",
      );
    case "roo-code":
      return resolveVsCodeExtensionMcp(
        ctx,
        "rooveterinaryinc.roo-cline",
        "mcp_settings.json",
      );
    case "gemini-cli":
      return resolveGeminiCli(ctx);
    case "vscode":
      return resolveVsCode(ctx);
    case "zed":
      return resolveZed(ctx);
  }
};

const resolveClaudeDesktop = (ctx: ResolveConfigPathContext): string | null => {
  if (ctx.platform === "darwin") {
    return path.join(
      ctx.homedir,
      "Library/Application Support/Claude/claude_desktop_config.json",
    );
  }
  if (ctx.platform === "win32" && ctx.appData) {
    return path.join(ctx.appData, "Claude/claude_desktop_config.json");
  }
  // Linux は Claude Desktop 公式サポート無し
  return null;
};

// Claude Code はユーザーグローバル設定の ~/.claude.json に書き込む。
// プロジェクト固有の `<project>/.mcp.json` は MVP では対象外（後続フェーズで検討）。
const resolveClaudeCode = (ctx: ResolveConfigPathContext): string => {
  return path.join(ctx.homedir, ".claude.json");
};

const resolveCursor = (ctx: ResolveConfigPathContext): string => {
  return path.join(ctx.homedir, ".cursor/mcp.json");
};

const resolveWindsurf = (ctx: ResolveConfigPathContext): string => {
  return path.join(ctx.homedir, ".codeium/windsurf/mcp_config.json");
};

// Gemini CLI のグローバル設定。`mcpServers` キーで MCP サーバーを定義（Phase 1 のラッパー形式と完全互換）。
const resolveGeminiCli = (ctx: ResolveConfigPathContext): string => {
  return path.join(ctx.homedir, ".gemini/settings.json");
};

// VS Code のユーザーレベル mcp.json。ルート直下に `servers` キーで MCP サーバーを定義する独立ファイル。
const resolveVsCode = (ctx: ResolveConfigPathContext): string | null => {
  const userDataDir = resolveVsCodeUserDataDir(ctx);
  if (!userDataDir) return null;
  return path.join(userDataDir, "User/mcp.json");
};

// Zed の設定は JSONC 形式の settings.json。`context_servers` キーで MCP サーバーを定義する。
const resolveZed = (ctx: ResolveConfigPathContext): string | null => {
  if (ctx.platform === "win32") {
    if (!ctx.appData) return null;
    return path.join(ctx.appData, "Zed/settings.json");
  }
  // macOS / Linux 共通: ~/.config/zed/settings.json
  return path.join(ctx.homedir, ".config/zed/settings.json");
};

// VS Code 拡張 (Cline / Roo Code) の MCP 設定パスを返す。
// 拡張IDと最終ファイル名のみクライアント固有で、それ以外のディレクトリ階層は VS Code 共通規約に従う。
const resolveVsCodeExtensionMcp = (
  ctx: ResolveConfigPathContext,
  extensionId: string,
  fileName: string,
): string | null => {
  const userDataDir = resolveVsCodeUserDataDir(ctx);
  if (!userDataDir) return null;
  return path.join(
    userDataDir,
    "User/globalStorage",
    extensionId,
    "settings",
    fileName,
  );
};

// VS Code Insiders（`Code - Insiders` ディレクトリ）は対象外（後続フェーズで検討）
const resolveVsCodeUserDataDir = (
  ctx: ResolveConfigPathContext,
): string | null => {
  if (ctx.platform === "darwin") {
    return path.join(ctx.homedir, "Library/Application Support/Code");
  }
  if (ctx.platform === "win32") {
    if (!ctx.appData) return null;
    return path.join(ctx.appData, "Code");
  }
  if (ctx.platform === "linux") {
    return path.join(ctx.homedir, ".config/Code");
  }
  return null;
};
