import type { McpProxyLaunchCommand } from "../../main/types";

// "cursor" は Cursor 専用ではなく、Cursor / Claude Desktop / VS Code / Cline 等が共通で使う
// `{ mcpServers: { ... } }` ラッパー形式の代表名として扱う（claude-code のみ独自形式）
export type AiClientFormat = "claude-code" | "cursor" | "claude-desktop";

export type AiClientSnippetSpec = {
  name: string;
  format: AiClientFormat;
};

// Claude Code は .mcp.json 直下に server-name キーを置く形式、Cursor / Claude Desktop は mcpServers でラップする形式
export const AI_CLIENT_SNIPPETS: readonly AiClientSnippetSpec[] = [
  { name: "Claude Code / .mcp.json", format: "claude-code" },
  { name: "Cursor", format: "cursor" },
  { name: "Claude Desktop", format: "claude-desktop" },
] as const;

// 各 AI クライアントの設定スニペット (JSON 文字列) を生成する。launchCommand は OS / packaged / dev 環境で異なる絶対パスが入る。
export const buildMcpSnippet = (
  launchCommand: McpProxyLaunchCommand,
  slug: string,
  format: AiClientFormat,
  pretty = false,
): string => {
  const entry = {
    command: launchCommand.command,
    args: [...launchCommand.args, "--server", slug],
  };
  const config =
    format === "claude-code"
      ? { [slug]: entry }
      : { mcpServers: { [slug]: entry } };
  return pretty ? JSON.stringify(config, null, 2) : JSON.stringify(config);
};
