import os from "node:os";
import path from "node:path";

export type SupportedAiClientId = "claude-desktop" | "cursor";

export type ResolveConfigPathContext = {
  platform: NodeJS.Platform;
  homedir: string;
  appData: string | undefined;
};

// Phase 1 で対応する2クライアント分の OS別パス解決。Phase 2 以降でケース追加していく。
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
    case "cursor":
      return resolveCursor(ctx);
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

const resolveCursor = (ctx: ResolveConfigPathContext): string | null => {
  // Cursor は3OS共通で ~/.cursor/mcp.json
  return path.join(ctx.homedir, ".cursor/mcp.json");
};
