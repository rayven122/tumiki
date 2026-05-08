import type { AiClientInfo } from "../_components/AiClientInstallModal";

/** AIクライアント定義（詳細ページ / AIツール連携ページで共通利用） */
export type AiClient = AiClientInfo & {
  /** 設定ファイルの典型的なパス（ユーザー向け表示用） */
  configTargetPath: string;
};

export const AI_CLIENTS: AiClient[] = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    logoPath: (t) =>
      t === "dark"
        ? "/logos/ai-clients/claude.webp"
        : "/logos/ai-clients/claude.svg",
    configTargetPath:
      "~/Library/Application Support/Claude/claude_desktop_config.json",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    logoPath: (t) =>
      t === "dark"
        ? "/logos/ai-clients/claude.webp"
        : "/logos/ai-clients/claude.svg",
    configTargetPath: "~/.claude.json",
  },
  {
    id: "cursor",
    name: "Cursor",
    logoPath: (t) =>
      t === "dark"
        ? "/logos/ai-clients/cursor.webp"
        : "/logos/ai-clients/cursor.svg",
    configTargetPath: "~/.cursor/mcp.json",
  },
  {
    id: "vscode",
    name: "VS Code",
    logoPath: (t) =>
      t === "dark"
        ? "/logos/ai-clients/copilot.webp"
        : "/logos/ai-clients/copilot.svg",
    configTargetPath: "~/Library/Application Support/Code/User/mcp.json",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    logoPath: () => "/logos/ai-clients/gemini-cli.svg",
    configTargetPath: "~/.gemini/settings.json",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    logoPath: (t) =>
      t === "dark"
        ? "/logos/ai-clients/antigravity.webp"
        : "/logos/ai-clients/antigravity.svg",
    configTargetPath: "Antigravity → Settings → MCP",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    logoPath: () => "/logos/ai-clients/windsurf.svg",
    configTargetPath: "~/.codeium/windsurf/mcp_config.json",
  },
  {
    id: "cline",
    name: "Cline",
    logoPath: (t) =>
      t === "dark"
        ? "/logos/ai-clients/cline.webp"
        : "/logos/ai-clients/cline.svg",
    configTargetPath:
      "~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json",
  },
  {
    id: "raycast",
    name: "Raycast",
    logoPath: () => "/logos/ai-clients/raycast.svg",
    configTargetPath: "Raycast → Extensions → MCP Servers",
  },
  {
    id: "zed",
    name: "Zed",
    logoPath: () => "/logos/ai-clients/zed.svg",
    configTargetPath: "~/.config/zed/settings.json",
  },
  {
    id: "roo-code",
    name: "Roo Code",
    logoPath: () => "/logos/ai-clients/roo-code.svg",
    configTargetPath:
      "~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json",
  },
  {
    id: "warp",
    name: "Warp",
    logoPath: () => "/logos/ai-clients/warp.svg",
    configTargetPath: "Warp → Settings → AI → MCP Servers",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    logoPath: () => "/logos/ai-clients/codex-cli.svg",
    configTargetPath: "~/.codex/config.toml",
  },
];
