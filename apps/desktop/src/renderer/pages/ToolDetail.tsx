import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, HISTORY } from "../data/mock";
import type { ToolStatus, HistoryStatus } from "../data/mock";

/** ステータスバッジの表示定義 */
const statusBadge: Record<
  ToolStatus,
  { style: React.CSSProperties; label: string }
> = {
  active: {
    style: {
      backgroundColor: "var(--badge-success-bg)",
      color: "var(--badge-success-text)",
    },
    label: "稼働中",
  },
  degraded: {
    style: {
      backgroundColor: "var(--badge-warn-bg)",
      color: "var(--badge-warn-text)",
    },
    label: "応答遅延",
  },
  down: {
    style: {
      backgroundColor: "var(--badge-error-bg)",
      color: "var(--badge-error-text)",
    },
    label: "停止中",
  },
};

/** 履歴ステータスのpillスタイル */
const historyStatusPill: Record<
  HistoryStatus,
  { bg: string; text: string; label: string }
> = {
  success: { bg: "bg-emerald-400/10", text: "text-emerald-400", label: "成功" },
  timeout: { bg: "bg-amber-400/10", text: "text-amber-400", label: "遅延" },
  blocked: { bg: "bg-red-400/10", text: "text-red-400", label: "拒否" },
  error: { bg: "bg-red-400/10", text: "text-red-400", label: "エラー" },
};

/** カードの共通スタイル */
const cardStyle: React.CSSProperties = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-card)",
  boxShadow: "var(--shadow-card)",
};

export const ToolDetail = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const { toolId } = useParams<{ toolId: string }>();
  const tool = TOOLS.find((t) => t.id === toolId);

  // ツールが見つからない場合
  if (!tool) {
    return (
      <div className="p-6">
        <Link
          to="/tools"
          className="flex items-center gap-1 text-sm hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} />
          コネクト
        </Link>
        <div
          className="mt-12 text-center text-sm"
          style={{ color: "var(--text-subtle)" }}
        >
          ツールが見つかりません
        </div>
      </div>
    );
  }

  const badge = statusBadge[tool.status];

  // 該当ツールの操作履歴
  const toolHistory = HISTORY.filter((h) => h.tool === tool.name);

  // 権限が不足している操作があるか
  const hasLockedOperations = tool.operations.some((op) => !op.allowed);

  return (
    <div className="space-y-6 p-6">
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        コネクト
      </Link>

      {/* ツール名 + ステータス */}
      <div className="flex items-center gap-3">
        <img
          src={theme === "dark" ? tool.logoDark : tool.logoLight}
          alt={tool.name}
          className="h-12 w-12 rounded-lg"
        />
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-2xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {tool.name}
            </h1>
            <span
              className="rounded-full px-2 py-0.5 text-xs"
              style={badge.style}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tool.description}
          </p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          基本情報
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              接続先
            </span>
            <p
              className="mt-1 flex items-center gap-1"
              style={{ color: "var(--text-secondary)" }}
            >
              <ExternalLink size={12} />
              {tool.endpoint}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              プロトコル
            </span>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
              {tool.protocol}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              追加日
            </span>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
              {tool.addedDate}
            </p>
          </div>
          <div>
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>
              管理者
            </span>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
              {tool.admin}
            </p>
          </div>
        </div>
      </div>

      {/* あなたの権限（LP風トグル表示） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="mb-4 flex items-center gap-2">
          <Shield size={14} style={{ color: "var(--text-muted)" }} />
          <h2
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            あなたの権限
          </h2>
        </div>

        {/* LP風のグリッド表示 */}
        <div
          className="overflow-hidden rounded-lg"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
          }}
        >
          {tool.operations.map((op, idx) => (
            <div
              key={op.name}
              className="flex items-center gap-3 px-4 py-2.5"
              style={{
                backgroundColor: "var(--bg-card)",
                ...(idx < tool.operations.length - 1
                  ? {
                      borderBottomWidth: 1,
                      borderBottomStyle: "solid" as const,
                      borderBottomColor: "var(--border-subtle)",
                    }
                  : {}),
              }}
            >
              {/* ON/OFF ドット */}
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${op.allowed ? "bg-emerald-400" : "bg-zinc-700"}`}
              />
              {/* 操作名 */}
              <span
                className="w-36 shrink-0 font-mono text-xs"
                style={{
                  color: op.allowed
                    ? "var(--text-secondary)"
                    : "var(--text-subtle)",
                }}
              >
                {op.name}
              </span>
              {/* 説明 */}
              <span
                className="flex-1 text-xs"
                style={{
                  color: op.allowed
                    ? "var(--text-muted)"
                    : "var(--text-subtle)",
                }}
              >
                {op.description}
              </span>
              {/* ステータスラベル */}
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  op.allowed
                    ? "bg-emerald-400/10 text-emerald-400"
                    : "bg-zinc-700/30 text-zinc-500"
                }`}
              >
                {op.allowed ? "許可" : "不可"}
              </span>
            </div>
          ))}
        </div>

        {hasLockedOperations && (
          <div className="mt-4">
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--btn-primary-text)",
              }}
            >
              不可の権限を申請する
            </Link>
          </div>
        )}
      </div>

      {/* 利用統計（目立つデザイン） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          利用統計（今月）
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "総リクエスト",
              value: tool.stats.requests.toLocaleString(),
              suffix: "",
            },
            {
              label: "成功率",
              value: tool.stats.successRate.toString(),
              suffix: "%",
            },
            {
              label: "平均応答",
              value: tool.stats.avgLatency.toString(),
              suffix: "ms",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg p-3 text-center"
              style={{ backgroundColor: "var(--bg-card-hover)" }}
            >
              <p
                className="text-2xl font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {stat.value}
                <span
                  className="ml-0.5 text-sm font-normal"
                  style={{ color: "var(--text-muted)" }}
                >
                  {stat.suffix}
                </span>
              </p>
              <p
                className="mt-1 text-[10px]"
                style={{ color: "var(--text-subtle)" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 最近の操作（pillバッジ） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          最近の操作
        </h2>
        {toolHistory.length > 0 ? (
          <div className="space-y-2">
            {toolHistory.map((item) => {
              const pill = historyStatusPill[item.status];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ backgroundColor: "var(--bg-card-hover)" }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.datetime}
                    </span>
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {item.operation}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.detail}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {item.latency}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${pill.bg} ${pill.text}`}
                    >
                      {pill.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>
            操作履歴がありません
          </p>
        )}
      </div>
    </div>
  );
};
