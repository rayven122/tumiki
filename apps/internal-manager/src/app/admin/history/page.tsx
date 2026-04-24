"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  AUDIT_LOGS,
  getStatusBadge,
  type LogStatus,
} from "../_components/mock-data";

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

const AdminHistoryPage = () => {
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
          <h1 className="text-text-primary text-lg font-semibold">操作履歴</h1>
          <p className="text-text-secondary mt-1 text-xs">
            MCPツール呼び出しの監査ログ
          </p>
        </div>
        <button
          type="button"
          className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
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
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <span className="text-text-muted text-xs">{s.label}</span>
            <div className="text-text-primary mt-2 text-2xl font-semibold">
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
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのステータス</option>
          <option value="success">成功</option>
          <option value="blocked">ブロック</option>
          <option value="error">エラー</option>
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          {services.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? "すべてのツール" : s}
            </option>
          ))}
        </select>
        <span className="text-text-subtle ml-auto text-xs">
          {filtered.length} 件表示
        </span>
      </div>

      {/* テーブル */}
      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        <div className="border-b-border-default text-text-subtle grid grid-cols-[110px_90px_110px_130px_1fr_85px_60px] items-center gap-2 border-b px-5 py-2.5 text-[10px]">
          <span>日時</span>
          <span>ユーザー</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>操作</span>
          <span>ステータス</span>
          <span className="text-right">応答</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-text-muted py-12 text-center text-sm">
            該当するログはありません
          </div>
        ) : (
          filtered.map((log) => {
            const badge = getStatusBadge(log.status);
            return (
              <div
                key={log.id}
                className="border-b-border-subtle grid grid-cols-[110px_90px_110px_130px_1fr_85px_60px] items-center gap-2 border-b px-5 py-3 text-xs transition-colors"
                style={{
                  backgroundColor:
                    log.status !== "success"
                      ? "rgba(239,68,68,0.03)"
                      : "transparent",
                }}
              >
                <span className="text-text-subtle font-mono text-[11px]">
                  {log.datetime}
                </span>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium ${log.user === "不明" ? "bg-badge-error-bg text-badge-error-text" : "bg-bg-active text-text-secondary"}`}
                  >
                    {log.user.charAt(0)}
                  </div>
                  <span className="text-text-secondary truncate">
                    {log.user}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: log.aiClientColor }}
                  />
                  <span className="text-text-muted text-[11px]">
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
                  <span className="text-text-secondary">{log.tool}</span>
                </div>
                <span className="text-text-muted truncate font-mono text-[11px]">
                  {log.operation}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
                <span className="text-text-subtle text-right font-mono text-[11px]">
                  {log.latency}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminHistoryPage;
