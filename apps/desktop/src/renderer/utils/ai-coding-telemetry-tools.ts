import type { AiCodingTool } from "../../main/types";

/**
 * AI クライアント ID → AiCodingTool マッピング。
 * 使用量記録（テレメトリ）対応ツールのみ含む。
 * 新ツール追加時はここを更新すれば AiIntegrations / AiClientAutoWriteModal の
 * 両方に反映される。
 */
export const TRACKING_TOOL_MAP: Partial<Record<string, AiCodingTool>> = {
  "claude-code": "claude-code",
  "codex-cli": "codex",
};

/**
 * UI 表示用のツール名ラベル。
 * トースト・カード・モーダル等で共通利用。
 */
export const TRACKING_TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};
