import type { AiCodingTool } from "../../main/types";

// AI クライアント ID → AiCodingTool マッピング（テレメトリ対応ツールのみ）
export const TRACKING_TOOL_MAP: Partial<Record<string, AiCodingTool>> = {
  "claude-code": "claude-code",
  "codex-cli": "codex",
};

// UI 表示用ツール名ラベル
export const TRACKING_TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};
