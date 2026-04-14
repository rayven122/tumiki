import type { JSX } from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import {
  ArrowLeft,
  ExternalLink,
  Shield,
  ChevronDown,
  Server,
} from "lucide-react";
import { themeAtom } from "../store/atoms";
import { MCP_BASE_URL, MCP_CLI_COMMAND } from "../data/mock";
import type { McpServerDetailItem, AuditLogItem } from "../../main/types";
import { statusBadge, cardStyle, selectStyle } from "../utils/theme-styles";

/** MCPサーバーステータスバッジの表示定義 */
const serverStatusBadge: Record<
  McpServerDetailItem["serverStatus"],
  { className: string; label: string }
> = {
  RUNNING: {
    className: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
    label: "稼働中",
  },
  STOPPED: {
    className: "bg-[var(--bg-active)] text-[var(--text-muted)]",
    label: "停止中",
  },
  ERROR: {
    className: "bg-[var(--badge-error-bg)] text-[var(--badge-error-text)]",
    label: "エラー",
  },
  PENDING: {
    className: "bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)]",
    label: "接続中",
  },
};

/** 監査ログ1ページあたりの件数 */
const AUDIT_LOG_LIMIT = 20;

/** AIクライアント接続先一覧（ダミー） TODO: DB化して実データに置換 */
const AI_CLIENT_CONNECTIONS = [
  {
    name: "Cursor",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/cursor.webp"
        : "/logos/ai-clients/cursor.svg",
    path: (id: string) => `${MCP_CLI_COMMAND} --connector=${id}`,
    type: "コマンド",
  },
  {
    name: "Claude Code",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/claude.webp"
        : "/logos/ai-clients/claude.svg",
    path: (id: string) => `${MCP_CLI_COMMAND} --connector=${id}`,
    type: "コマンド",
  },
  {
    name: "Cline",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/cline.webp"
        : "/logos/ai-clients/cline.svg",
    path: (id: string) => `${MCP_CLI_COMMAND} --connector=${id}`,
    type: "コマンド",
  },
  {
    name: "Claude",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/claude.webp"
        : "/logos/ai-clients/claude.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/sse`,
    type: "SSE",
  },
  {
    name: "ChatGPT",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/chatgpt.webp"
        : "/logos/ai-clients/chatgpt.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/http`,
    type: "HTTP",
  },
  {
    name: "Copilot",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/copilot.webp"
        : "/logos/ai-clients/copilot.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/http`,
    type: "HTTP",
  },
  {
    name: "Antigravity",
    logo: (t: string) =>
      t === "dark"
        ? "/logos/ai-clients/antigravity.webp"
        : "/logos/ai-clients/antigravity.svg",
    path: (id: string) => `${MCP_BASE_URL}/${id}/sse`,
    type: "SSE",
  },
  {
    name: "API",
    logo: () => "",
    path: (id: string) => `${MCP_BASE_URL}/${id}/http`,
    type: "HTTP",
  },
];

/** ダミー: 権限操作一覧 TODO: DB化して実データに置換 */
const DUMMY_OPERATIONS = [
  { name: "tools/call", description: "ツールの実行", allowed: true },
  { name: "tools/list", description: "ツール一覧の取得", allowed: true },
  { name: "resources/read", description: "リソースの読み取り", allowed: true },
  {
    name: "resources/write",
    description: "リソースの書き込み",
    allowed: false,
  },
  { name: "prompts/get", description: "プロンプトの取得", allowed: true },
];

export const ToolDetail = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const { toolId } = useParams<{ toolId: string }>();
  const serverId = Number(toolId);

  // サーバー詳細（実データ）
  const [server, setServer] = useState<McpServerDetailItem | null>(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [showAiClients, setShowAiClients] = useState(false);

  // 監査ログ（実データ）
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditTotalPages, setAuditTotalPages] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [successRate, setSuccessRate] = useState(0);
  const [avgDurationMs, setAvgDurationMs] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // サーバー詳細取得
  useEffect(() => {
    if (Number.isNaN(serverId)) {
      setServerLoading(false);
      return;
    }
    window.electronAPI.mcp
      .getDetail(serverId)
      .then(setServer)
      .catch(() => setServer(null))
      .finally(() => setServerLoading(false));
  }, [serverId]);

  // 監査ログ取得
  const loadAuditLogs = useCallback(
    async (page: number) => {
      if (Number.isNaN(serverId)) return;
      setAuditLoading(true);
      try {
        const result = await window.electronAPI.audit.listByServer({
          serverId,
          page,
          perPage: AUDIT_LOG_LIMIT,
          statusFilter: statusFilter === "all" ? undefined : statusFilter,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        setAuditLogs(result.items);
        setAuditTotal(result.totalCount);
        setAuditTotalPages(result.totalPages);
        setAuditPage(result.currentPage);
        setSuccessRate(result.successRate);
        setAvgDurationMs(result.avgDurationMs);
      } catch {
        setAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    },
    [serverId, statusFilter, dateFrom, dateTo],
  );

  // フィルター変更時にページ1にリセット
  useEffect(() => {
    loadAuditLogs(1);
  }, [loadAuditLogs]);

  // ローディング中
  if (serverLoading) {
    return (
      <div className="p-6">
        <Link
          to="/tools"
          className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:opacity-80"
        >
          <ArrowLeft size={14} />
          コネクト
        </Link>
        <div className="mt-12 text-center text-sm text-[var(--text-subtle)]">
          読み込み中...
        </div>
      </div>
    );
  }

  // サーバーが見つからない場合
  if (!server) {
    return (
      <div className="p-6">
        <Link
          to="/tools"
          className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:opacity-80"
        >
          <ArrowLeft size={14} />
          コネクト
        </Link>
        <div className="mt-12 text-center text-sm text-[var(--text-subtle)]">
          サーバーが見つかりません
        </div>
      </div>
    );
  }

  const badge = serverStatusBadge[server.serverStatus];
  const primaryConnection = server.connections[0];
  // 接続のカタログからアイコンを取得（最初に見つかったものを使用）
  const serverIcon = server.connections.find((c) => c.catalog?.iconPath)
    ?.catalog?.iconPath;

  // ダミー権限データ
  const hasLockedOperations = DUMMY_OPERATIONS.some((op) => !op.allowed);

  return (
    <div className="space-y-6 p-6">
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:opacity-80"
      >
        <ArrowLeft size={14} />
        コネクト
      </Link>

      {/* ツール名 + ステータス */}
      <div className="flex items-center gap-3">
        {serverIcon ? (
          <img
            src={serverIcon}
            alt={server.name}
            className="h-12 w-12 rounded-lg"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--bg-card-hover)]">
            <Server size={24} className="text-[var(--text-muted)]" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {server.name}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            {server.description || server.slug}
          </p>
        </div>
      </div>

      {/* 基本情報（実データ） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2 className="mb-4 text-sm font-medium text-[var(--text-primary)]">
          基本情報
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-[var(--text-subtle)]">接続先</span>
            <p className="mt-1 flex items-center gap-1 text-[var(--text-secondary)]">
              <ExternalLink size={12} />
              {primaryConnection
                ? primaryConnection.transportType === "STDIO"
                  ? (primaryConnection.command ?? "—")
                  : (primaryConnection.url ?? "—")
                : "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-[var(--text-subtle)]">
              プロトコル
            </span>
            <p className="mt-1 text-[var(--text-secondary)]">
              {primaryConnection?.transportType ?? "—"}
            </p>
          </div>
          <div>
            <span className="text-xs text-[var(--text-subtle)]">追加日</span>
            <p className="mt-1 text-[var(--text-secondary)]">
              {new Date(server.createdAt).toLocaleDateString("ja-JP")}
            </p>
          </div>
          <div>
            <span className="text-xs text-[var(--text-subtle)]">管理者</span>
            <p className="mt-1 text-[var(--text-secondary)]">システム管理者</p>
          </div>
        </div>

        {/* AIクライアント接続方法（アコーディオン + スクロール）— ダミーデータ */}
        <div className="mt-5 border-t border-t-[var(--border)] pt-4">
          <button
            onClick={() => setShowAiClients(!showAiClients)}
            className="flex w-full items-center justify-between"
          >
            <h3 className="text-xs font-medium text-[var(--text-primary)]">
              AIクライアントから接続
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[var(--text-subtle)]">
                {AI_CLIENT_CONNECTIONS.length}件
              </span>
              <ChevronDown
                size={14}
                className={`text-[var(--text-subtle)] transition-transform ${
                  showAiClients ? "rotate-180" : "rotate-0"
                }`}
              />
            </div>
          </button>

          {showAiClients && (
            <div className="mt-3 max-h-[280px] space-y-1.5 overflow-y-auto pr-1">
              {AI_CLIENT_CONNECTIONS.map((ai) => (
                <div
                  key={ai.name}
                  className="flex items-center gap-3 rounded-lg bg-[var(--bg-card-hover)] px-3 py-2"
                >
                  {ai.logo(theme) ? (
                    <img
                      src={ai.logo(theme)}
                      alt={ai.name}
                      className="h-5 w-5 shrink-0 rounded"
                    />
                  ) : (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-[var(--bg-active)] text-[8px] font-bold text-[var(--text-muted)]">
                      {"<>"}
                    </div>
                  )}
                  <span className="w-24 shrink-0 text-xs text-[var(--text-secondary)]">
                    {ai.name}
                  </span>
                  <span className="rounded bg-[var(--bg-active)] px-1.5 py-0.5 text-[8px] font-medium text-[var(--text-muted)]">
                    {ai.type}
                  </span>
                  <code className="flex-1 truncate rounded bg-[var(--bg-input)] px-2 py-1 font-mono text-[10px] text-[var(--text-secondary)]">
                    {ai.path(server.slug)}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* あなたの権限（LP風トグル表示）— ダミーデータ */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="mb-4 flex items-center gap-2">
          <Shield size={14} className="text-[var(--text-muted)]" />
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            あなたの権限
          </h2>
        </div>

        {/* LP風のグリッド表示 */}
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          {DUMMY_OPERATIONS.map((op, idx) => {
            const isLast = idx === DUMMY_OPERATIONS.length - 1;
            return (
              <div
                key={op.name}
                className={`flex items-center gap-3 bg-[var(--bg-card)] px-4 py-2.5 ${
                  isLast ? "" : "border-b border-b-[var(--border-subtle)]"
                }`}
              >
                {/* ON/OFF ドット */}
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    op.allowed
                      ? "bg-[var(--badge-success-text)]"
                      : "bg-[var(--text-subtle)]"
                  }`}
                />
                {/* 操作名 */}
                <span
                  className={`w-36 shrink-0 font-mono text-xs ${
                    op.allowed
                      ? "text-[var(--text-secondary)]"
                      : "text-[var(--text-subtle)]"
                  }`}
                >
                  {op.name}
                </span>
                {/* 説明 */}
                <span
                  className={`flex-1 text-xs ${
                    op.allowed
                      ? "text-[var(--text-muted)]"
                      : "text-[var(--text-subtle)]"
                  }`}
                >
                  {op.description}
                </span>
                {/* ステータスラベル */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    op.allowed
                      ? "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]"
                      : "bg-[var(--bg-active)] text-[var(--text-muted)]"
                  }`}
                >
                  {op.allowed ? "許可" : "不可"}
                </span>
              </div>
            );
          })}
        </div>

        {hasLockedOperations && (
          <div className="mt-4">
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] hover:opacity-90"
            >
              不可の権限を申請する
            </Link>
          </div>
        )}
      </div>

      {/* 利用統計（実データ: 監査ログから算出） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <h2 className="mb-4 text-sm font-medium text-[var(--text-primary)]">
          利用統計
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "総リクエスト",
              value: auditTotal.toLocaleString(),
              suffix: "",
            },
            {
              label: "成功率",
              value: successRate.toString(),
              suffix: "%",
            },
            {
              label: "平均応答",
              value: avgDurationMs.toString(),
              suffix: "ms",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg bg-[var(--bg-card-hover)] p-3 text-center"
            >
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {stat.value}
                <span className="ml-0.5 text-sm font-normal text-[var(--text-muted)]">
                  {stat.suffix}
                </span>
              </p>
              <p className="mt-1 text-[10px] text-[var(--text-subtle)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 最近の操作（実データ: 監査ログ + フィルター + ページネーション） */}
      <div className="rounded-xl p-6" style={cardStyle}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            最近の操作
          </h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "success" | "error")
              }
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            >
              <option value="all">すべてのステータス</option>
              <option value="success">成功</option>
              <option value="error">エラー</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={selectStyle}
            />
          </div>
        </div>
        {auditLogs.length > 0 ? (
          <div className="space-y-2">
            {auditLogs.map((log) => {
              const pill = statusBadge(log.isSuccess ? "success" : "error");
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-[var(--bg-card-hover)] px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--text-subtle)]">
                      {new Date(log.createdAt).toLocaleString("ja-JP", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {log.toolName}
                    </span>
                    <span className="text-xs text-[var(--text-subtle)]">
                      {log.detail ?? log.method}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[var(--text-subtle)]">
                      {log.durationMs}ms
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: pill.bg, color: pill.text }}
                    >
                      {pill.label}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* ページネーション */}
            {auditTotalPages > 1 && (
              <div className="flex items-center justify-center gap-1 pt-3">
                <button
                  type="button"
                  onClick={() => loadAuditLogs(auditPage - 1)}
                  disabled={auditPage <= 1 || auditLoading}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:opacity-80 disabled:opacity-30"
                >
                  &lt;
                </button>
                {Array.from({ length: auditTotalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === auditTotalPages ||
                      Math.abs(p - auditPage) <= 2,
                  )
                  .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1)
                      acc.push("ellipsis");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "ellipsis" ? (
                      <span
                        key={`e-${i}`}
                        className="px-1 text-xs text-[var(--text-subtle)]"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => loadAuditLogs(p)}
                        disabled={auditLoading}
                        className={`h-7 w-7 rounded-lg text-xs font-medium transition hover:opacity-80 disabled:opacity-50 ${
                          p === auditPage
                            ? "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                <button
                  type="button"
                  onClick={() => loadAuditLogs(auditPage + 1)}
                  disabled={auditPage >= auditTotalPages || auditLoading}
                  className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:opacity-80 disabled:opacity-30"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-subtle)]">
            {auditLoading ? "読み込み中..." : "操作履歴がありません"}
          </p>
        )}
      </div>
    </div>
  );
};
