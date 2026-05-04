"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";

type LogStatus = "success" | "blocked" | "error";
type StatusFilter = LogStatus | "all";

type AuditLogItem = RouterOutputs["auditLogs"]["list"]["items"][number];

const statusOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "すべてのステータス" },
  { value: "success", label: "成功" },
  { value: "blocked", label: "ブロック" },
  { value: "error", label: "エラー" },
];

const getStatusBadge = (status: LogStatus) => {
  switch (status) {
    case "success":
      return {
        label: "成功",
        bg: "bg-badge-success-bg",
        text: "text-badge-success-text",
      };
    case "blocked":
      return {
        label: "ブロック",
        bg: "bg-badge-warning-bg",
        text: "text-badge-warning-text",
      };
    case "error":
      return {
        label: "エラー",
        bg: "bg-badge-error-bg",
        text: "text-badge-error-text",
      };
  }
};

const formatDateTime = (value: Date) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);

const getUserLabel = (log: AuditLogItem) =>
  log.user.name ?? log.user.email ?? log.user.id;

const getToolColor = (mcpServerId: string) => {
  const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444"];
  const hash = Array.from(mcpServerId).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return colors[hash % colors.length] ?? colors[0];
};

const AdminHistoryPage = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [cursor, setCursor] = useState<string | undefined>();

  const auditLogsQuery = api.auditLogs.list.useQuery({
    status: statusFilter,
    mcpServerId: serviceFilter === "all" ? undefined : serviceFilter,
    limit: 100,
    cursor,
  });

  const data = auditLogsQuery.data;
  const summary = data?.summary ?? {
    total: 0,
    success: 0,
    blocked: 0,
    error: 0,
  };
  const successRate =
    summary.total > 0 ? Math.round((summary.success / summary.total) * 100) : 0;

  const summaryCards = [
    { label: "総件数", value: summary.total.toString() },
    { label: "成功率", value: `${successRate}%` },
    { label: "ブロック", value: summary.blocked.toString() },
    { label: "エラー", value: summary.error.toString() },
  ];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-lg font-semibold">操作履歴</h1>
          <p className="text-text-secondary mt-1 text-xs">
            Desktopから同期されたMCPツール呼び出しの監査ログ
          </p>
        </div>
        <button
          type="button"
          disabled
          className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium opacity-60"
          title="CSVエクスポートは未実装です"
        >
          <Download size={13} />
          CSVエクスポート
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <span className="text-text-muted text-xs">{card.label}</span>
            <div className="text-text-primary mt-2 text-2xl font-semibold">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as StatusFilter);
            setCursor(undefined);
          }}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={serviceFilter}
          onChange={(event) => {
            setServiceFilter(event.target.value);
            setCursor(undefined);
          }}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのMCPサーバー</option>
          {(data?.mcpServers ?? []).map((server) => (
            <option key={server.id} value={server.id}>
              {server.id} ({server.count})
            </option>
          ))}
        </select>
        <span className="text-text-subtle ml-auto text-xs">
          {auditLogsQuery.isLoading ? "読み込み中" : `${data?.total ?? 0} 件`}
        </span>
      </div>

      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        <div className="border-b-border-default text-text-subtle grid grid-cols-[120px_150px_130px_130px_1fr_90px_70px_70px] items-center gap-2 border-b px-5 py-2.5 text-[10px]">
          <span>日時</span>
          <span>ユーザー</span>
          <span>AIクライアント</span>
          <span>接続先</span>
          <span>操作</span>
          <span>ステータス</span>
          <span className="text-right">HTTP</span>
          <span className="text-right">応答</span>
        </div>

        {auditLogsQuery.isLoading ? (
          <div className="text-text-muted flex items-center justify-center gap-2 py-12 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            読み込み中
          </div>
        ) : auditLogsQuery.isError ? (
          <div className="text-badge-error-text py-12 text-center text-sm">
            監査ログを取得できませんでした
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <div className="text-text-muted py-12 text-center text-sm">
            該当するログはありません
          </div>
        ) : (
          data?.items.map((log) => {
            const badge = getStatusBadge(log.status);
            const userLabel = getUserLabel(log);
            const serviceName = log.connectionName ?? log.mcpServerId;
            return (
              <div
                key={log.id}
                className="border-b-border-subtle grid grid-cols-[120px_150px_130px_130px_1fr_90px_70px_70px] items-center gap-2 border-b px-5 py-3 text-xs transition-colors"
                style={{
                  backgroundColor:
                    log.status !== "success"
                      ? "rgba(239,68,68,0.03)"
                      : "transparent",
                }}
              >
                <span className="text-text-subtle font-mono text-[11px]">
                  {formatDateTime(log.occurredAt)}
                </span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="bg-bg-active text-text-secondary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-medium">
                    {userLabel.charAt(0)}
                  </div>
                  <span className="text-text-secondary truncate">
                    {userLabel}
                  </span>
                </div>
                <span className="text-text-muted truncate text-[11px]">
                  {log.clientName ?? "不明"}
                </span>
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                    style={{ backgroundColor: getToolColor(serviceName) }}
                  >
                    {serviceName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-text-secondary truncate">
                    {serviceName}
                  </span>
                </div>
                <span className="text-text-muted truncate font-mono text-[11px]">
                  {log.method}:{log.toolName}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-center text-[9px] font-medium ${badge.bg} ${badge.text}`}
                >
                  {badge.label}
                </span>
                <span className="text-text-subtle text-right font-mono text-[11px]">
                  {log.httpStatus}
                </span>
                <span className="text-text-subtle text-right font-mono text-[11px]">
                  {log.durationMs}ms
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={!cursor}
          onClick={() => setCursor(undefined)}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          先頭へ
        </button>
        <button
          type="button"
          disabled={!data?.nextCursor}
          onClick={() => setCursor(data?.nextCursor ?? undefined)}
          className="bg-bg-active text-text-secondary rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-40"
        >
          次の100件
        </button>
      </div>
    </div>
  );
};

export default AdminHistoryPage;
