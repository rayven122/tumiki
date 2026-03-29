import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { TOOLS, HISTORY } from "../data/mock";
import type { ToolStatus } from "../data/mock";

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

export const ToolDetail = (): JSX.Element => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = TOOLS.find((t) => t.id === toolId);

  // ツールが見つからない場合
  if (!tool) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <Link
          to="/tools"
          className="flex items-center gap-1 text-sm hover:opacity-80"
          style={{ color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} />
          マイツール
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
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        マイツール
      </Link>

      {/* ツール名 + ステータス */}
      <div className="flex items-center gap-3">
        <img src={tool.logo} alt={tool.name} className="h-12 w-12 rounded-lg" />
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
      <div
        className="rounded-xl p-5"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
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

      {/* あなたの権限 */}
      <div
        className="rounded-xl p-5"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Shield size={14} style={{ color: "var(--text-muted)" }} />
          <h2
            className="text-sm font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            あなたの権限
          </h2>
        </div>
        <div
          className="overflow-hidden rounded-lg"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottomWidth: 1,
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--border)",
                  backgroundColor: "var(--bg-card-hover)",
                }}
              >
                <th
                  className="px-4 py-2 text-left text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  操作
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  説明
                </th>
                <th
                  className="px-4 py-2 text-center text-xs font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  状態
                </th>
              </tr>
            </thead>
            <tbody>
              {tool.operations.map((op) => (
                <tr
                  key={op.name}
                  style={{
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--border-subtle)",
                  }}
                >
                  <td
                    className="px-4 py-2 font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {op.name}
                  </td>
                  <td
                    className="px-4 py-2 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {op.description}
                  </td>
                  <td className="px-4 py-2 text-center text-xs">
                    {op.allowed ? (
                      <span className="text-emerald-400">可</span>
                    ) : (
                      <span style={{ color: "var(--text-subtle)" }}>不可</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* 利用統計 */}
      <div
        className="rounded-xl p-5"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          利用統計（今月）
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              総リクエスト数
            </p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {tool.stats.requests}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              成功率
            </p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {tool.stats.successRate}%
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              平均応答時間
            </p>
            <p
              className="mt-1 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {tool.stats.avgLatency}ms
            </p>
          </div>
        </div>
      </div>

      {/* 最近の操作 */}
      <div
        className="rounded-xl p-5"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        <h2
          className="mb-4 text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          最近の操作
        </h2>
        {toolHistory.length > 0 ? (
          <div className="space-y-3">
            {toolHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
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
                <span
                  className={
                    item.status === "success"
                      ? "text-emerald-400"
                      : item.status === "timeout"
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {item.latency}
                </span>
              </div>
            ))}
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
