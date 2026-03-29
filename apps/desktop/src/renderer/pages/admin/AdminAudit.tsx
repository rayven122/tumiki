import type { JSX } from "react";
import { useState } from "react";
import { Activity, Download, User } from "lucide-react";
import { AUDIT_LOGS } from "../../data/admin-mock";
import type { AuditLogEntry } from "../../data/admin-mock";

/** ステータスバッジの設定 */
const statusBadge = (
  status: AuditLogEntry["status"],
): { bg: string; text: string; label: string } => {
  const config = {
    success: {
      bg: "var(--badge-success-bg)",
      text: "var(--badge-success-text)",
      label: "成功",
    },
    blocked: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "ブロック",
    },
    error: {
      bg: "var(--badge-error-bg)",
      text: "var(--badge-error-text)",
      label: "エラー",
    },
  };
  return config[status];
};

/** セレクトの共通スタイル */
const selectStyle = {
  borderWidth: 1,
  borderStyle: "solid" as const,
  borderColor: "var(--border)",
  backgroundColor: "var(--bg-card)",
  color: "var(--text-secondary)",
};

export const AdminAudit = (): JSX.Element => {
  const [userFilter, setUserFilter] = useState("all");
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // ユニーク値を取得
  const users = [...new Set(AUDIT_LOGS.map((l) => l.user))];
  const tools = [...new Set(AUDIT_LOGS.map((l) => l.tool))];

  // フィルタ適用
  const filtered = AUDIT_LOGS.filter((l) => {
    if (userFilter !== "all" && l.user !== userFilter) return false;
    if (toolFilter !== "all" && l.tool !== toolFilter) return false;
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    return true;
  });

  // サマリー計算
  const total = filtered.length;
  const successCount = filtered.filter((l) => l.status === "success").length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;
  const blockedCount = filtered.filter((l) => l.status === "blocked").length;
  const uniqueUsers = new Set(filtered.map((l) => l.user)).size;

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            監査ログ
          </h1>
          <p
            className="mt-0.5 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            全ユーザーのAIエージェント操作ログ
          </p>
        </div>
      </div>

      {/* サマリーカード4つ */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: "総件数",
            value: total,
            color: "var(--text-primary)",
          },
          {
            label: "成功率",
            value: `${successRate}%`,
            color: "var(--badge-success-text)",
          },
          {
            label: "ブロック",
            value: blockedCount,
            color: "var(--badge-error-text)",
          },
          {
            label: "ユニークユーザー",
            value: uniqueUsers,
            color: "var(--text-primary)",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {card.label}
            </span>
            <div
              className="mt-2 text-2xl font-semibold"
              style={{ color: card.color }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* メインカード（フィルタ + テーブル） */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* フィルタバー */}
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Activity
              className="h-4 w-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              操作ログ
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total}件
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* ユーザーフィルタ */}
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            >
              <option value="all">すべてのユーザー</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {/* ツールフィルタ */}
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            >
              <option value="all">すべてのツール</option>
              {tools.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* ステータスフィルタ */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            >
              <option value="all">すべてのステータス</option>
              <option value="success">成功</option>
              <option value="blocked">ブロック</option>
              <option value="error">エラー</option>
            </select>
          </div>
        </div>

        {/* テーブル */}
        <table className="w-full">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--bg-card-hover)",
              }}
            >
              {[
                "日時",
                "ユーザー",
                "部署",
                "ツール",
                "操作",
                "ステータス",
                "応答時間",
              ].map((label) => (
                <th
                  key={label}
                  className={`px-4 py-3 text-[11px] font-medium ${label === "応答時間" ? "text-right" : "text-left"}`}
                  style={{ color: "var(--text-muted)" }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const badge = statusBadge(item.status);
              const isBlocked = item.status === "blocked";
              const isUnknownUser = item.user === "不明";
              return (
                <tr
                  key={item.id}
                  className="transition-colors hover:opacity-90"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    backgroundColor: isBlocked
                      ? "var(--bg-error-row, rgba(239,68,68,0.03))"
                      : undefined,
                  }}
                >
                  {/* 日時 */}
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.datetime}
                  </td>

                  {/* ユーザー（イニシャルアバター + 名前） */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isUnknownUser ? (
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500">
                          <User className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: "var(--bg-card-hover)" }}
                        >
                          <span
                            className="text-[10px] font-medium"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {item.user.charAt(0)}
                          </span>
                        </div>
                      )}
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {item.user}
                      </span>
                    </div>
                  </td>

                  {/* 部署 */}
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.department}
                  </td>

                  {/* ツール */}
                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.tool}
                  </td>

                  {/* 操作 */}
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.operation}
                  </td>

                  {/* ステータスバッジ */}
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {badge.label}
                    </span>
                  </td>

                  {/* 応答時間 */}
                  <td
                    className="px-4 py-3 text-right font-mono text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.latency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* エクスポートボタン */}
      <div className="flex items-center gap-2">
        <Download
          className="h-3.5 w-3.5"
          style={{ color: "var(--text-subtle)" }}
        />
        <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
          エクスポート:
        </span>
        {["CSV", "JSON", "SIEM"].map((format) => (
          <button
            key={format}
            type="button"
            className="rounded px-2 py-0.5 text-[9px] transition hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-active)",
              color: "var(--text-muted)",
            }}
          >
            {format}
          </button>
        ))}
      </div>
    </div>
  );
};
