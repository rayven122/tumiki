import { useState, useCallback } from "react";
import type { JSX } from "react";
import { useAtomValue } from "jotai";
import {
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  Loader2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { themeAtom } from "../store/atoms";
import { toast } from "../_components/Toast";
import { cardStyle } from "../utils/theme-styles";
import {
  useAiCodingTelemetrySummary,
  useAiCodingTelemetryDailyUsage,
  useAiCodingToolSettings,
  useOtlpReceiverPort,
} from "../hooks/useAiCodingTelemetry";
import type { AiCodingTool, DailyUsageItem } from "../../main/types";

type Period = "7d" | "30d";

const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30 };

const TOOL_LABELS: Record<AiCodingTool, string> = {
  "claude-code": "Claude Code",
  codex: "Codex CLI",
};

// MM-DD 形式に短縮する
const formatDate = (dateStr: string): string => dateStr.slice(5);

// 大きな数値を K / M 付きで表示する
const formatNumber = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(Math.round(value));
};

/** ツール別設定カード */
const ToolSettingCard = ({
  tool,
  port,
}: {
  tool: AiCodingTool;
  port: number;
}): JSX.Element => {
  const { settings, isLoading, refresh } = useAiCodingToolSettings(tool);
  const [isApplying, setIsApplying] = useState(false);
  const [showCommands, setShowCommands] = useState(false);

  const handleToggle = (): void => {
    const newEnabled = !(settings?.enabled ?? false);
    void window.electronAPI.aiCodingTelemetry
      .saveToolEnabled(tool, newEnabled)
      .then(() => refresh());
  };

  const handleApply = (): void => {
    if (port === 0) {
      toast.error("OTLP レシーバーが起動していません");
      return;
    }
    setIsApplying(true);
    void window.electronAPI.aiCodingTelemetry
      .applyToTool(tool, port)
      .then((result) => {
        if (result.success) {
          toast.success(`${TOOL_LABELS[tool]} の設定ファイルに書き込みました`);
          refresh();
        } else {
          toast.error(
            `設定の書き込みに失敗しました: ${result.errorCode ?? "UNKNOWN"}`,
          );
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`設定の書き込みに失敗しました: ${message}`);
      })
      .finally(() => {
        setIsApplying(false);
      });
  };

  // 手動設定用コマンド
  const commands =
    tool === "claude-code"
      ? `export CLAUDE_CODE_ENABLE_TELEMETRY=1\nexport OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${port}`
      : `export OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:${port}`;

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(commands).then(() => {
      toast.success("コマンドをコピーしました");
    });
  };

  return (
    <div className="rounded-xl p-4" style={cardStyle}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {TOOL_LABELS[tool]}
          </p>
          {settings?.appliedAt && (
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              適用済み:{" "}
              {new Date(settings.appliedAt).toLocaleDateString("ja-JP")}
              {settings.appliedPort !== undefined &&
                ` (port: ${settings.appliedPort})`}
            </p>
          )}
        </div>
        {!isLoading && (
          <button
            type="button"
            role="switch"
            aria-checked={settings?.enabled ?? false}
            aria-label={`${TOOL_LABELS[tool]} のテレメトリを有効化`}
            onClick={handleToggle}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              settings?.enabled
                ? "bg-[var(--badge-success-text)]"
                : "bg-[var(--text-subtle)]"
            }`}
          >
            <div
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                settings?.enabled ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleApply}
          disabled={isApplying || port === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-card-hover)] disabled:opacity-50"
          style={cardStyle}
        >
          {isApplying ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Check size={12} />
          )}
          設定をファイルに書き込む
        </button>
        <button
          type="button"
          onClick={() => setShowCommands((prev) => !prev)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-secondary)]"
          style={cardStyle}
        >
          手動設定コマンド
          {showCommands ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showCommands && (
        <div className="mt-2 rounded-lg bg-[var(--bg-code,var(--bg-app))] p-3">
          <pre className="overflow-x-auto text-xs text-[var(--text-secondary)]">
            {commands}
          </pre>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          >
            <ClipboardCopy size={12} />
            コピー
          </button>
        </div>
      )}
    </div>
  );
};

/** 折れ線グラフ用データ変換（トークン系メトリクスを集計） */
const buildChartData = (
  dailyUsage: DailyUsageItem[],
): { date: string; claudeCode: number; codex: number }[] => {
  const byDate = new Map<string, { claudeCode: number; codex: number }>();

  for (const item of dailyUsage) {
    if (!item.metricName.toLowerCase().includes("token")) continue;
    const existing = byDate.get(item.date) ?? { claudeCode: 0, codex: 0 };
    if (item.tool === "claude-code") existing.claudeCode += item.totalValue;
    else if (item.tool === "codex") existing.codex += item.totalValue;
    byDate.set(item.date, existing);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date: formatDate(date), ...values }));
};

export const AiCodingTelemetry = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [period, setPeriod] = useState<Period>("7d");
  const days = PERIOD_DAYS[period];

  const port = useOtlpReceiverPort();
  const { data: summary, isLoading: summaryLoading } =
    useAiCodingTelemetrySummary(days);
  const { data: dailyUsage, isLoading: dailyLoading } =
    useAiCodingTelemetryDailyUsage(days);

  // KPI 集計
  const totalTokens = summary
    ? summary
        .filter((s) => s.metricName.toLowerCase().includes("token"))
        .reduce((sum, s) => sum + s.totalValue, 0)
    : 0;
  const totalToolUses = summary
    ? summary
        .filter((s) => s.metricName.toLowerCase().includes("tool_use"))
        .reduce((sum, s) => sum + s.totalValue, 0)
    : 0;

  const chartData = dailyUsage ? buildChartData(dailyUsage) : [];
  const hasData = chartData.length > 0;

  const lineColor = theme === "dark" ? "#10a37f" : "#0a7c59";
  const gridColor =
    theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const handlePeriodChange = useCallback((p: Period): void => {
    setPeriod(p);
  }, []);

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-lg bg-[var(--bg-active)] p-2">
          <BarChart2 size={18} className="text-[var(--text-primary)]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            AI 使用量
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Claude Code・Codex CLI のトークン使用量を記録します
          </p>
        </div>
      </div>

      {/* テレメトリ設定セクション */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--text-muted)]">
            テレメトリ設定
          </h2>
          {port > 0 && (
            <span className="rounded-full bg-[var(--bg-active)] px-2 py-0.5 text-xs text-[var(--text-primary)]">
              受信ポート: {port}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToolSettingCard tool="claude-code" port={port} />
          <ToolSettingCard tool="codex" port={port} />
        </div>
      </section>

      {/* 使用量ダッシュボード */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--text-muted)]">
            使用量ダッシュボード
          </h2>
          <div className="flex rounded-lg border border-[var(--border)]">
            {(["7d", "30d"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePeriodChange(p)}
                className={`px-3 py-1 text-xs transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  period === p
                    ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {p === "7d" ? "7日間" : "30日間"}
              </button>
            ))}
          </div>
        </div>

        {/* KPI カード */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={cardStyle}>
            <p className="text-xs text-[var(--text-muted)]">総トークン数</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {summaryLoading ? "—" : formatNumber(totalTokens)}
            </p>
          </div>
          <div className="rounded-xl p-4" style={cardStyle}>
            <p className="text-xs text-[var(--text-muted)]">
              ツール呼び出し回数
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
              {summaryLoading ? "—" : formatNumber(totalToolUses)}
            </p>
          </div>
        </div>

        {/* 折れ線グラフ */}
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="mb-3 text-xs font-medium text-[var(--text-muted)]">
            日別トークン数推移
          </p>
          {dailyLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-[var(--text-muted)]">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : !hasData ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                データがありません
              </p>
              <p className="text-xs text-[var(--text-subtle)]">
                上の設定でテレメトリを有効にすると、使用量が表示されます
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id="gradClaudeCode"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCodex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DA704E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#DA704E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatNumber}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value) =>
                    typeof value === "number"
                      ? [formatNumber(value), ""]
                      : [String(value), ""]
                  }
                />
                <Area
                  type="monotone"
                  dataKey="claudeCode"
                  name="Claude Code"
                  stroke={lineColor}
                  fill="url(#gradClaudeCode)"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="codex"
                  name="Codex CLI"
                  stroke="#DA704E"
                  fill="url(#gradCodex)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
};
