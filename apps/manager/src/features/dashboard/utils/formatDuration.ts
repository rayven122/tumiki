/** 実行時間を人間が読みやすい形式にフォーマット */
export const formatDuration = (durationMs: number | null): string => {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)}秒`;
  return `${(durationMs / 60_000).toFixed(1)}分`;
};
