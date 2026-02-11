/**
 * エージェント関連の共通定数
 */

/** デフォルトで使用するAIモデルID */
export const DEFAULT_MODEL_ID = "anthropic/claude-3.5-sonnet";

// AIモデル選択肢
export const MODEL_OPTIONS = [
  { value: "default", label: "デフォルト（Claude 3.5 Sonnet）" },
  { value: DEFAULT_MODEL_ID, label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku（高速）" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus（高性能）" },
] as const;

// 型定義
export type ModelOption = (typeof MODEL_OPTIONS)[number];
export type ModelValue = ModelOption["value"];

// ========================================
// ポーリング間隔（用途別）
// ========================================

/** リアルタイムログのポーリング間隔（3秒） */
export const REALTIME_LOG_POLLING_MS = 3000;

// ========================================
// 進捗表示関連
// ========================================

/** 進捗更新間隔（100ms - スムーズなアニメーション用） */
export const PROGRESS_UPDATE_INTERVAL_MS = 100;

/** 警告閾値（90%を超えると警告状態） */
export const PROGRESS_WARNING_THRESHOLD = 90;

/** 想定時間のバッファ（10秒）- 平均時間に余裕を持たせる */
export const ESTIMATED_DURATION_BUFFER_MS = 10 * 1000;

// ========================================
// 進捗計算ヘルパー
// ========================================

/**
 * 進捗率を計算（想定時間 = 平均時間 + バッファ）
 *
 * @param createdAt - 実行開始時刻
 * @param estimatedDurationMs - 推定実行時間（0以下の場合はバッファのみで計算）
 * @returns 進捗率（0-99%）。無効な入力の場合は0を返す
 */
export const calculateProgress = (
  createdAt: Date,
  estimatedDurationMs: number,
): number => {
  // 無効な日付のバリデーション
  const createdAtTime = createdAt.getTime();
  if (Number.isNaN(createdAtTime)) {
    return 0;
  }

  const elapsedMs = Date.now() - createdAtTime;

  // 負の経過時間（未来の日付）の場合は0を返す
  if (elapsedMs < 0) {
    return 0;
  }

  // estimatedDurationMsが0以下の場合はバッファのみで計算
  // 負の値を0として扱うことで、最低限バッファ分の時間で進捗を計算
  const safeEstimatedDurationMs = Math.max(estimatedDurationMs, 0);
  const adjustedDurationMs =
    safeEstimatedDurationMs + ESTIMATED_DURATION_BUFFER_MS;

  // 平均時間にバッファを追加して、進捗率を緩やかに表示
  return Math.min((elapsedMs / adjustedDurationMs) * 100, 99);
};
