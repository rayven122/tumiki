import type { JSX } from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import {
  ArrowLeft,
  Server,
  Search,
  MoreHorizontal,
  EyeOff,
  Archive,
  SearchCode,
  ChevronRight,
  Plug,
} from "lucide-react";
import { themeAtom } from "../store/atoms";
import { MCP_CLI_COMMAND } from "../data/mock";
import { AI_CLIENTS, type AiClient } from "../data/ai-clients";
import type {
  McpServerDetailItem,
  McpToolItem,
  AuditLogItem,
} from "../../main/types";
import { statusBadge, cardStyle } from "../utils/theme-styles";
import { ClientLogo } from "../_components/ClientLogo";
import { ToggleSwitch } from "../_components/ToggleSwitch";
import { AiClientInstallModal } from "../_components/AiClientInstallModal";
import { toast } from "../_components/Toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../_components/Select";

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

/** 機能設定トグルの永続化キー（サーバーごと） */
const FEATURE_SETTINGS_KEY = (serverId: number): string =>
  `tumiki:server:${serverId}:features`;

/** 提供ツール表示用の拡張型（connectionName を含む） */
type DisplayTool = McpToolItem & { connectionName: string };

// サンプルツール（allTools が空のときの表示用、id は負数でサンプル識別）
// タイムスタンプは固定値（モジュールロード時の副作用回避のため）
const SAMPLE_TIMESTAMP = "2026-01-01T00:00:00.000Z";
const SAMPLE_TOOLS: DisplayTool[] = [
  {
    id: -1,
    name: "search_documents",
    description:
      "自然言語クエリで索引済みドキュメントを検索します。結果はスコア順に返されます。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: true,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -2,
    name: "read_file",
    description: "指定されたパスのファイル内容を読み取ります。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: true,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -3,
    name: "write_file",
    description:
      "指定されたパスに内容を書き込みます。既存ファイルは上書きされます。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: false,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -4,
    name: "list_directory",
    description:
      "ディレクトリ内のエントリ一覧を返します（ファイル/サブディレクトリ）。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: true,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -5,
    name: "execute_query",
    description:
      "SQL クエリを実行し結果を JSON 形式で返します。SELECT/INSERT/UPDATE/DELETE に対応。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: true,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -6,
    name: "create_issue",
    description: "指定リポジトリに新規 Issue を作成します。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: true,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -7,
    name: "send_notification",
    description:
      "指定宛先に通知メッセージを送信します（チャンネル/DM 両対応）。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: true,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
  {
    id: -8,
    name: "fetch_url",
    description:
      "指定 URL の内容を HTTP GET で取得し、テキスト本文として返します。",
    inputSchema: "{}",
    customName: null,
    customDescription: null,
    isAllowed: false,
    connectionId: 0,
    createdAt: SAMPLE_TIMESTAMP,
    updatedAt: SAMPLE_TIMESTAMP,
    connectionName: "sample",
  },
];

type FeatureSettings = {
  masking: boolean;
  compression: boolean;
  dynamicSearch: boolean;
};

const DEFAULT_FEATURE_SETTINGS: FeatureSettings = {
  masking: false,
  compression: false,
  dynamicSearch: false,
};

export const ToolDetail = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const { toolId } = useParams<{ toolId: string }>();
  const serverId = Number(toolId);

  // サーバー詳細（実データ）
  const [server, setServer] = useState<McpServerDetailItem | null>(null);
  const [serverLoading, setServerLoading] = useState(true);

  // 提供ツール: 検索 + on/off state（Phase 2 で IPC 接続）
  const [toolQuery, setToolQuery] = useState("");
  const [toolAllowedMap, setToolAllowedMap] = useState<Record<number, boolean>>(
    {},
  );

  // 機能設定トグル（localStorage 永続化、バックエンド未実装）
  const [featureSettings, setFeatureSettings] = useState<FeatureSettings>(
    DEFAULT_FEATURE_SETTINGS,
  );

  // ヘッダーの3点リーダーメニュー開閉
  const [showMenu, setShowMenu] = useState(false);

  // 接続先AIサイドバーから選択中のクライアント
  const [selectedClient, setSelectedClient] = useState<AiClient | null>(null);

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
  // 操作履歴の自由文フィルタ（クライアント側、ツール/クライアント/内容でマッチ）
  const [logQuery, setLogQuery] = useState("");

  // サーバー詳細取得 + ツール on/off 初期値セット
  useEffect(() => {
    if (Number.isNaN(serverId)) {
      setServerLoading(false);
      return;
    }
    window.electronAPI.mcp
      .getDetail(serverId)
      .then((detail) => {
        setServer(detail);
        if (detail) {
          const initialMap: Record<number, boolean> = {};
          for (const conn of detail.connections) {
            for (const tool of conn.tools) {
              initialMap[tool.id] = tool.isAllowed;
            }
          }
          setToolAllowedMap(initialMap);
        }
      })
      .catch(() => setServer(null))
      .finally(() => setServerLoading(false));
  }, [serverId]);

  // 機能設定トグルを localStorage から復元（サーバーごと）
  useEffect(() => {
    if (Number.isNaN(serverId)) return;
    try {
      const raw = localStorage.getItem(FEATURE_SETTINGS_KEY(serverId));
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setFeatureSettings({
            ...DEFAULT_FEATURE_SETTINGS,
            ...(parsed as Partial<FeatureSettings>),
          });
        }
      }
    } catch {
      // パース失敗時はデフォルトのまま
    }
  }, [serverId]);

  const updateFeature = (key: keyof FeatureSettings, value: boolean): void => {
    const next = { ...featureSettings, [key]: value };
    setFeatureSettings(next);
    try {
      localStorage.setItem(
        FEATURE_SETTINGS_KEY(serverId),
        JSON.stringify(next),
      );
    } catch {
      // localStorage 書き込み失敗時は state のみ更新
    }
  };

  // ツール on/off（即時反映、失敗時はロールバック。サンプルID は IPC スキップ）
  const toggleTool = (toolId: number, isAllowed: boolean): void => {
    const previous = toolAllowedMap[toolId] ?? !isAllowed;
    setToolAllowedMap((prev) => ({ ...prev, [toolId]: isAllowed }));
    // サンプルツール（負数ID）は永続化しない
    if (toolId < 0) return;
    window.electronAPI.mcp.toggleTool({ toolId, isAllowed }).catch(() => {
      setToolAllowedMap((prev) => ({ ...prev, [toolId]: previous }));
      toast.error("ツールの切替に失敗しました");
    });
  };

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

  // 全接続からツールを集約（実データ）
  const allTools: DisplayTool[] = server.connections.flatMap((conn) =>
    conn.tools.map((tool) => ({ ...tool, connectionName: conn.name })),
  );
  // 実データが空ならサンプルツールで代替表示
  const isSampleTools = allTools.length === 0;
  const baseTools = isSampleTools ? SAMPLE_TOOLS : allTools;

  /** 選択クライアント向けの MCP 設定 JSON スニペット生成 */
  const buildConfigSnippet = (): string => {
    const parts = MCP_CLI_COMMAND.split(" ");
    return JSON.stringify(
      {
        mcpServers: {
          [server.slug]: {
            command: parts[0] ?? "npx",
            args: [...parts.slice(1), "--server", server.slug],
          },
        },
      },
      null,
      2,
    );
  };
  const filteredTools = baseTools.filter((t) => {
    const q = toolQuery.trim().toLowerCase();
    if (q === "") return true;
    const displayName = t.customName ?? t.name;
    const displayDescription = t.customDescription ?? t.description;
    return (
      displayName.toLowerCase().includes(q) ||
      displayDescription.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:opacity-80"
      >
        <ArrowLeft size={14} />
        コネクト
      </Link>

      {/* 2カラムレイアウト: メインコンテンツ + 右サイドバー（接続先AI） 高さ合わせ、両側スクロール可 */}
      <div className="mt-4 flex max-h-[calc(100vh-10rem)] min-h-0 items-stretch gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {/* ヘッダーカード: サーバー概要 + 基本情報 + 機能設定 + 3点リーダー */}
          <div className="rounded-xl p-5" style={cardStyle}>
            {/* 上段: アイコン + 名前 + ステータス + 統計 + 3点リーダー */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                {serverIcon ? (
                  <img
                    src={serverIcon}
                    alt={server.name}
                    className="h-12 w-12 shrink-0 rounded-lg"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-card-hover)]">
                    <Server size={24} className="text-[var(--text-muted)]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-[var(--text-primary)]">
                      {server.name}
                    </h1>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {/* インライン統計（利用統計の大ボックスを吸収） */}
                    <div className="flex shrink-0 items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="text-[var(--text-subtle)]">·</span>
                      <span title="総リクエスト">
                        <span className="font-mono text-[var(--text-secondary)]">
                          {auditTotal.toLocaleString()}
                        </span>
                        <span className="ml-0.5 text-[var(--text-subtle)]">
                          req
                        </span>
                      </span>
                      <span className="text-[var(--text-subtle)]">·</span>
                      <span title="成功率">
                        <span className="font-mono text-[var(--text-secondary)]">
                          {successRate}
                        </span>
                        <span className="ml-0.5 text-[var(--text-subtle)]">
                          %
                        </span>
                      </span>
                      <span className="text-[var(--text-subtle)]">·</span>
                      <span title="平均応答">
                        <span className="font-mono text-[var(--text-secondary)]">
                          {avgDurationMs}
                        </span>
                        <span className="ml-0.5 text-[var(--text-subtle)]">
                          ms
                        </span>
                      </span>
                    </div>
                  </div>
                  <p className="truncate text-sm text-[var(--text-muted)]">
                    {server.description || server.slug}
                  </p>
                </div>
              </div>

              {/* 3点リーダーメニュー */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                  aria-label="メニュー"
                  aria-expanded={showMenu}
                >
                  <MoreHorizontal size={18} />
                </button>
                {showMenu && (
                  <>
                    {/* 外側クリックで閉じるオーバーレイ */}
                    <button
                      type="button"
                      aria-label="メニューを閉じる"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-card)] shadow-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          toast.success("サーバー設定編集は近日対応予定");
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                      >
                        サーバー設定を編集
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 基本情報（インライン・ラベル+値） */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-t-[var(--border-subtle)] pt-3 text-xs">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-[var(--text-subtle)]">接続先</span>
                <span className="truncate font-mono text-[var(--text-secondary)]">
                  {primaryConnection
                    ? primaryConnection.transportType === "STDIO"
                      ? (primaryConnection.command ?? "—")
                      : (primaryConnection.url ?? "—")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-subtle)]">プロトコル</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {primaryConnection?.transportType ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-subtle)]">追加日</span>
                <span className="text-[var(--text-secondary)]">
                  {new Date(server.createdAt).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--text-subtle)]">識別子</span>
                <span className="font-mono text-[var(--text-secondary)]">
                  {server.slug}
                </span>
              </div>
            </div>

            {/* 機能設定（マスキング / 圧縮 / 動的検索） */}
            <div className="mt-4 border-t border-t-[var(--border-subtle)] pt-4">
              <div className="mb-2 text-xs font-medium text-[var(--text-muted)]">
                機能設定
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {[
                  {
                    key: "masking" as const,
                    icon: <EyeOff size={13} />,
                    label: "マスキング",
                    desc: "機密情報を自動マスクします",
                  },
                  {
                    key: "compression" as const,
                    icon: <Archive size={13} />,
                    label: "レスポンス圧縮",
                    desc: "トークン使用量を削減します",
                  },
                  {
                    key: "dynamicSearch" as const,
                    icon: <SearchCode size={13} />,
                    label: "動的検索",
                    desc: "ツールをオンデマンドで検索します",
                  },
                ].map((f) => (
                  <div
                    key={f.key}
                    title={f.desc}
                    className="flex items-center justify-between gap-2 rounded-lg bg-[var(--bg-card-hover)] px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-[var(--text-muted)]">
                        {f.icon}
                      </span>
                      <span className="truncate text-xs text-[var(--text-primary)]">
                        {f.label}
                      </span>
                    </div>
                    <ToggleSwitch
                      checked={featureSettings[f.key]}
                      onChange={(v) => updateFeature(f.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 提供ツールカード */}
          <div
            className="flex min-h-0 flex-1 flex-col rounded-xl p-4"
            style={cardStyle}
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium text-[var(--text-primary)]">
                提供ツール
                <span className="ml-2 text-xs text-[var(--text-subtle)]">
                  {baseTools.length}件
                  {isSampleTools && (
                    <span className="ml-1 rounded bg-[var(--bg-active)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--text-muted)]">
                      サンプル
                    </span>
                  )}
                </span>
              </h2>
            </div>
            <div className="relative mb-2">
              <Search
                size={12}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-subtle)]"
              />
              <input
                type="text"
                placeholder="ツールを検索..."
                value={toolQuery}
                onChange={(e) => setToolQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-1.5 pr-2 pl-8 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)]"
              />
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {filteredTools.length === 0 ? (
                <p className="py-6 text-center text-xs text-[var(--text-subtle)]">
                  条件に一致するツールが見つかりません
                </p>
              ) : (
                filteredTools.map((tool) => {
                  const displayName = tool.customName ?? tool.name;
                  const displayDescription =
                    tool.customDescription ?? tool.description;
                  const isOn = toolAllowedMap[tool.id] ?? tool.isAllowed;
                  return (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] px-2.5 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs font-medium text-[var(--text-primary)]">
                          {displayName}
                        </div>
                        {displayDescription && (
                          <div className="mt-0.5 line-clamp-1 text-[10px] text-[var(--text-muted)]">
                            {displayDescription}
                          </div>
                        )}
                      </div>
                      <ToggleSwitch
                        checked={isOn}
                        onChange={(v) => toggleTool(tool.id, v)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 右サイドバー: 接続先AI一覧（左カラムと高さを揃える） */}
        <aside className="hidden w-64 shrink-0 xl:block">
          <div
            className="flex h-full flex-col rounded-xl p-4"
            style={cardStyle}
          >
            <div className="mb-2 flex items-center gap-2 border-b border-b-[var(--border-subtle)] pb-2">
              <Plug size={13} className="text-[var(--text-muted)]" />
              <h2 className="text-xs font-medium text-[var(--text-primary)]">
                接続先AI
              </h2>
              <span className="ml-auto text-[10px] text-[var(--text-subtle)]">
                {AI_CLIENTS.length}件
              </span>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {AI_CLIENTS.map((client) => {
                const logo = client.logoPath?.(theme);
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="flex w-full items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card-hover)] px-2.5 py-1.5 text-left transition hover:border-[var(--border)] hover:bg-[var(--bg-active)]"
                  >
                    {logo ? (
                      <img
                        src={logo}
                        alt={client.name}
                        className="h-4 w-4 shrink-0 rounded"
                      />
                    ) : (
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--bg-active)] text-[8px] font-bold text-[var(--text-muted)]">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 truncate text-[11px] text-[var(--text-primary)]">
                      {client.name}
                    </span>
                    <ChevronRight
                      size={11}
                      className="shrink-0 text-[var(--text-subtle)]"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* 最近の操作（実データ: 監査ログ + フィルター + ページネーション） — サイドバーを超えてフル幅 */}
      <div className="mt-4 rounded-xl p-6" style={cardStyle}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            最近の操作
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-[var(--text-subtle)]"
              />
              <input
                type="text"
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                placeholder="ツール・クライアント・内容で検索..."
                className="w-52 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] py-1 pr-2 pl-7 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-subtle)]"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                setStatusFilter(value as "all" | "success" | "error")
              }
            >
              <SelectTrigger className="h-7 w-auto px-2 py-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのステータス</SelectItem>
                <SelectItem value="success">成功</SelectItem>
                <SelectItem value="error">エラー</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)] outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)] outline-none"
            />
          </div>
        </div>
        {auditLoading && auditLogs.length === 0 ? (
          <p className="text-sm text-[var(--text-subtle)]">読み込み中...</p>
        ) : (
          <div className="space-y-2">
            {(() => {
              // 自由文フィルタはクライアント側で適用（ページング・件数は API 側）
              const q = logQuery.trim().toLowerCase();
              const displayLogs =
                q === ""
                  ? auditLogs
                  : auditLogs.filter(
                      (log) =>
                        log.toolName.toLowerCase().includes(q) ||
                        (log.clientName ?? "").toLowerCase().includes(q) ||
                        (log.detail ?? "").toLowerCase().includes(q),
                    );
              const effectiveTotalPages = auditTotalPages;
              const goPage = (p: number): void => {
                void loadAuditLogs(p);
              };
              const formatBytes = (n: number): string =>
                n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
              return (
                <>
                  <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--bg-card-hover)]">
                        <tr className="text-left text-[var(--text-muted)]">
                          <th className="px-3 py-2 font-medium">日時</th>
                          <th className="px-3 py-2 font-medium">
                            クライアント
                          </th>
                          <th className="px-3 py-2 font-medium">ツール</th>
                          <th className="px-3 py-2 font-medium">リクエスト</th>
                          <th className="px-3 py-2 font-medium">レスポンス</th>
                          <th className="px-3 py-2 text-right font-medium">
                            時間
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            ステータス
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {displayLogs.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-3 py-6 text-center text-[var(--text-subtle)]"
                            >
                              条件に一致する操作履歴が見つかりません
                            </td>
                          </tr>
                        ) : (
                          displayLogs.map((log, idx) => {
                            const pill = statusBadge(
                              log.isSuccess ? "success" : "error",
                            );
                            const isLast = idx === displayLogs.length - 1;
                            const requestText = formatBytes(log.inputBytes);
                            const responseText = formatBytes(log.outputBytes);
                            return (
                              <tr
                                key={log.id}
                                className={
                                  isLast
                                    ? ""
                                    : "border-b border-b-[var(--border-subtle)]"
                                }
                              >
                                <td className="px-3 py-2 whitespace-nowrap text-[var(--text-subtle)]">
                                  {new Date(log.createdAt).toLocaleString(
                                    "ja-JP",
                                    {
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    },
                                  )}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  {log.clientName ? (
                                    <div className="flex items-center gap-1.5">
                                      <ClientLogo clientName={log.clientName} />
                                      <span className="text-[var(--text-muted)]">
                                        {log.clientName}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[var(--text-subtle)]">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono whitespace-nowrap text-[var(--text-secondary)]">
                                  {log.toolName}
                                </td>
                                <td
                                  className="max-w-[200px] truncate px-3 py-2 font-mono text-[var(--text-subtle)]"
                                  title={requestText}
                                >
                                  {requestText}
                                </td>
                                <td
                                  className="max-w-[200px] truncate px-3 py-2 font-mono text-[var(--text-subtle)]"
                                  title={responseText}
                                >
                                  {responseText}
                                </td>
                                <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-[var(--text-subtle)]">
                                  {log.durationMs}ms
                                </td>
                                <td className="px-3 py-2 text-right whitespace-nowrap">
                                  <span
                                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${pill.className}`}
                                  >
                                    {pill.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ページネーション */}
                  {effectiveTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-3">
                      <button
                        type="button"
                        onClick={() => goPage(auditPage - 1)}
                        disabled={auditPage <= 1 || auditLoading}
                        className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:opacity-80 disabled:opacity-30"
                      >
                        &lt;
                      </button>
                      {Array.from(
                        { length: effectiveTotalPages },
                        (_, i) => i + 1,
                      )
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === effectiveTotalPages ||
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
                              onClick={() => goPage(p)}
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
                        onClick={() => goPage(auditPage + 1)}
                        disabled={
                          auditPage >= effectiveTotalPages || auditLoading
                        }
                        className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition hover:opacity-80 disabled:opacity-30"
                      >
                        &gt;
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* AIクライアント追加モーダル */}
      {selectedClient && (
        <AiClientInstallModal
          client={selectedClient}
          serverName={server.name}
          configSnippet={buildConfigSnippet()}
          targetPath={selectedClient.configTargetPath}
          theme={theme}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
};
