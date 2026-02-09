/**
 * エージェント関連の共通定数
 */

// AIモデル選択肢
export const MODEL_OPTIONS = [
  { value: "default", label: "デフォルト（Claude 3.5 Sonnet）" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku（高速）" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus（高性能）" },
] as const;

// 型定義
export type ModelOption = (typeof MODEL_OPTIONS)[number];
export type ModelValue = ModelOption["value"];
