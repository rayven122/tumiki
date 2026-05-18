import type { ConfigurableAiCodingTool } from "../../main/types";

// AI クライアント ID → ConfigurableAiCodingTool マッピング（テレメトリ対応ツールのみ）
export const TRACKING_TOOL_MAP: Partial<
  Record<string, ConfigurableAiCodingTool>
> = {
  "claude-code": "claude-code",
  "codex-cli": "codex",
};

// UI 表示用ツール名ラベル
export const TRACKING_TOOL_LABELS: Partial<Record<string, string>> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  "codex-app-server": "Codex",
};

export const AI_METRIC_CATEGORY_LABELS: Record<string, string> = {
  all: "すべて",
  tokens: "トークン",
  cost: "コスト",
  active_time: "アクティブ時間",
  session: "セッション",
  tool_call: "ツール呼び出し",
  api: "API / WebSocket",
  other: "その他",
};

export const AI_METRIC_CATEGORIES = [
  "all",
  "tokens",
  "cost",
  "active_time",
  "session",
  "tool_call",
  "api",
  "other",
] as const;

export const classifyAiMetric = (
  metricName: string,
): (typeof AI_METRIC_CATEGORIES)[number] => {
  const normalized = metricName.toLowerCase();
  if (normalized.includes("token")) return "tokens";
  if (normalized.includes("cost")) return "cost";
  if (normalized.includes("active_time") || normalized.includes("duration")) {
    return "active_time";
  }
  if (normalized.includes("session")) return "session";
  if (
    normalized.includes("tool.call") ||
    normalized.includes("tool_use") ||
    normalized.includes("unified_exec")
  ) {
    return "tool_call";
  }
  if (
    normalized.includes("api") ||
    normalized.includes("websocket") ||
    normalized.includes("request") ||
    normalized.includes("response")
  ) {
    return "api";
  }
  return "other";
};

export const formatAiMetricValue = (
  metricName: string,
  value: number,
): string => {
  const category = classifyAiMetric(metricName);
  if (category === "cost") return `$${value.toFixed(value < 1 ? 4 : 2)}`;
  if (category === "active_time") return `${value.toFixed(1)}s`;
  const compact =
    value >= 1_000_000
      ? `${(value / 1_000_000).toFixed(1)}M`
      : value >= 1_000
        ? `${(value / 1_000).toFixed(1)}K`
        : Number.isInteger(value)
          ? value.toLocaleString()
          : value.toFixed(1);
  return category === "tokens" ? `${compact} tokens` : compact;
};
