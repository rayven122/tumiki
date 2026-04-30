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
    configTargetPath: "<プロジェクトルート>/.mcp.json",
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
    configTargetPath: "~/Library/Application Support/Code/User/settings.json",
  },
  {
    id: "windsurf",
    name: "Windsurf",
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
    configTargetPath: "Raycast → Extensions → MCP Servers",
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    configTargetPath: "~/.gemini/settings.json",
  },
  {
    id: "continue",
    name: "Continue",
    configTargetPath: "~/.continue/config.json",
  },
  {
    id: "zed",
    name: "Zed",
    configTargetPath: "~/.config/zed/settings.json",
  },
  {
    id: "goose",
    name: "Goose",
    configTargetPath: "~/.config/goose/config.yaml",
  },
  {
    id: "roo-code",
    name: "Roo Code",
    configTargetPath:
      "~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/mcp_settings.json",
  },
  {
    id: "librechat",
    name: "LibreChat",
    configTargetPath: "<プロジェクトルート>/librechat.yaml",
  },
  {
    id: "warp",
    name: "Warp",
    configTargetPath: "Warp → Settings → AI → MCP Servers",
  },
  {
    id: "amp",
    name: "Amp",
    configTargetPath: "~/.ampcode/config.json",
  },
  {
    id: "aider",
    name: "Aider",
    configTargetPath: "~/.aider.conf.yml",
  },
  {
    id: "codex-cli",
    name: "Codex CLI",
    configTargetPath: "~/.codex/config.toml",
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
];
