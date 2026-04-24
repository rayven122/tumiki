"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { AUDIT_LOGS, type LogStatus } from "../_components/mock-data";

const statusBadge = (status: LogStatus) => {
  const map: Record<LogStatus, { bg: string; text: string; label: string }> = {
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
  return map[status];
};

const SUMMARY = [
  { label: "総件数", value: AUDIT_LOGS.length.toString() },
  {
    label: "成功率",
    value: `${Math.round((AUDIT_LOGS.filter((l) => l.status === "success").length / AUDIT_LOGS.length) * 100)}%`,
  },
  {
    label: "ブロック",
    value: AUDIT_LOGS.filter((l) => l.status === "blocked").length.toString(),
  },
  {
    label: "エラー",
    value: AUDIT_LOGS.filter((l) => l.status === "error").length.toString(),
  },
];

export default function AdminHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<LogStatus | "all">("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const services = [
    "all",
    ...Array.from(new Set(AUDIT_LOGS.map((l) => l.tool))),
  ];
  const filtered = AUDIT_LOGS.filter(
    (l) =>
      (statusFilter === "all" || l.status === statusFilter) &&
      (serviceFilter === "all" || l.tool === serviceFilter),
  );

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            操作履歴
          </h1>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            MCPツール呼び出しの監査ログ
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--bg-active)",
            color: "var(--text-secondary)",
          }}
        >
          <Download size={13} />
          CSVエクスポート
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SUMMARY.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {s.label}
            </span>
            <div
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LogStatus | "all")}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          <option value="all">すべてのステータス</option>
          <option value="success">成功</option>
          <option value="blocked">ブロック</option>
          <option value="error">エラー</option>
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          {services.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "すべてのツール" : s}
            </option>
          ))}
        </select>
        <span
          className="ml-auto text-xs"
          style={{ color: "var(--text-subtle)" }}
        >
          {filtered.length} 件表示
        </span>
      </div>

      {/* テーブル */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        <div
          className="grid grid-cols-[110px_90px_110px_130px_1fr_85px_60px] items-center gap-2 px-5 py-2.5 text-[10px]"
          style={{
            borderBottom: "1px solid var(--border)",
            color: "var(--text-subtle)",
          }}
        >
          <span>日時</span>
          <span>ユーザー</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>操作</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {filtered.length === 0 ? (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
          >
            該当するログはありません
          </div>
        ) : (
          filtered.map((log) => {
            const badge = statusBadge(log.status);
            return (
              <div
                key={log.id}
                className="grid grid-cols-[110px_90px_110px_130px_1fr_85px_60px] items-center gap-2 px-5 py-3 text-xs transition-colors"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  backgroundColor:
                    log.status !== "success"
                      ? "rgba(239,68,68,0.03)"
                      : "transparent",
                }}
              >
                <span
                  className="font-mono text-[11px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {log.datetime}
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium"
                    style={{
                      backgroundColor:
                        log.user === "不明"
                          ? "var(--badge-error-bg)"
                          : "var(--bg-active)",
                      color:
                        log.user === "不明"
                          ? "var(--badge-error-text)"
                          : "var(--text-secondary)",
                    }}
                  >
                    {log.user.charAt(0)}
                  </div>
                  <span
                    className="truncate"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {log.user}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: log.aiClientColor }}
                  />
                  <span
                    className="text-[11px]"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {log.aiClient}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                    style={{ backgroundColor: log.toolColor }}
                  >
                    {log.tool.slice(0, 2).toUpperCase()}
                  </span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {log.tool}
                  </span>
                </div>
                <span
                  className="truncate font-mono text-[11px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {log.operation}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {badge.label}
                </span>
                <span
                  className="text-right font-mono text-[11px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {log.latency}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
