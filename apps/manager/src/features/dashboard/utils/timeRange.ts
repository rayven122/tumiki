/** ダッシュボードで共通の時間範囲の型 */
export type TimeRange = "24h" | "7d" | "30d";

/** 時間範囲の日本語ラベル */
export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  "24h": "24時間",
  "7d": "7日間",
  "30d": "30日間",
};
