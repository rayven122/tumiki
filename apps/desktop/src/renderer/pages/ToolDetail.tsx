import type { JSX } from "react";
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Server,
  Search,
  MoreHorizontal,
  EyeOff,
  Archive,
  SearchCode,
  RefreshCw,
  ChevronRight,
  Plug,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { useAtomValue } from "jotai";
import { reauthCompletedSignalAtom } from "../store/atoms";
import { AI_CLIENTS, type AiClient } from "../data/ai-clients";
import { useMcpProxyLaunchCommand } from "../hooks/useMcpProxyLaunchCommand";
import { buildMcpSnippet } from "../utils/mcp-snippet";
import type {
  McpServerDetailItem,
  McpConnectionDetailItem,
  McpToolItem,
  AuditLogItem,
} from "../../main/types";
import { statusBadge, cardStyle } from "../utils/theme-styles";
import { ClientLogo } from "../_components/ClientLogo";
import { ToggleSwitch } from "../_components/ToggleSwitch";
import { AiClientInstallModal } from "../_components/AiClientInstallModal";
import { OAuthReauthModal } from "../_components/OAuthReauthModal";
import { EditMcpServerModal } from "../_components/EditMcpServerModal";
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
    className:
      "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
    label: "稼働中",
  },
  STOPPED: {
    className:
      "bg-black/[.06] dark:bg-white/[.08] text-gray-500 dark:text-zinc-500",
    label: "停止中",
  },
  ERROR: {
    className:
      "bg-red-500/10 dark:bg-red-400/10 text-red-600 dark:text-red-400",
    label: "エラー",
  },
  PENDING: {
    className:
      "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
    label: "接続中",
  },
};

/** 監査ログ1ページあたりの件数 */
const AUDIT_LOG_LIMIT = 20;

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

export const ToolDetail = (): JSX.Element => {
  // deeplink 経由の再認証完了シグナル。変化したら getDetail を再フェッチして needsReauth バナーを更新する。
  const reauthSignal = useAtomValue(reauthCompletedSignalAtom);
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

  // PII マスキング: DB 永続化（McpServer.isPiiMaskingEnabled）。初期値は getDetail 取得後に上書き
  const [maskingEnabled, setMaskingEnabled] = useState(true);
  // レスポンス圧縮（TOON 変換）: DB 永続化（McpServer.isToonConversionEnabled）。初期値は getDetail 取得後に上書き
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  // 動的検索: DB 永続化（McpServer.dynamicSearch）。初期値は getDetail 取得後に上書き
  const [dynamicSearchEnabled, setDynamicSearchEnabled] = useState(false);
  const [dynamicSearchUpdating, setDynamicSearchUpdating] = useState(false);
  const [dynamicSearchError, setDynamicSearchError] = useState<string | null>(
    null,
  );
  const [toolsRefreshing, setToolsRefreshing] = useState(false);
  const [toolsRefreshError, setToolsRefreshError] = useState<string | null>(
    null,
  );

  // ヘッダーの3点リーダーメニュー開閉
  const [showMenu, setShowMenu] = useState(false);

  // OAuth再認証モーダル開閉と進行中フラグ
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [reauthProcessing, setReauthProcessing] = useState(false);

  // サーバー設定編集モーダル開閉
  const [showEditModal, setShowEditModal] = useState(false);

  // 接続先AIサイドバーから選択中のクライアント
  const [selectedClient, setSelectedClient] = useState<AiClient | null>(null);

  const applyServerDetail = useCallback(
    (detail: McpServerDetailItem | null): void => {
      setServer(detail);
      if (!detail) return;

      const nextToolAllowedMap: Record<number, boolean> = {};
      for (const conn of detail.connections) {
        for (const tool of conn.tools) {
          nextToolAllowedMap[tool.id] = tool.isAllowed;
        }
      }
      setToolAllowedMap(nextToolAllowedMap);
      setMaskingEnabled(detail.isPiiMaskingEnabled);
      setCompressionEnabled(detail.isToonConversionEnabled);
      setDynamicSearchEnabled(detail.dynamicSearch);
    },
    [],
  );

  // MCP プロキシ起動コマンド（接続スニペット生成に利用）
  const launchCommand = useMcpProxyLaunchCommand();

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
      .then(applyServerDetail)
      .catch(() => setServer(null))
      .finally(() => setServerLoading(false));
    // reauthSignal が変化するとフックが再実行され、最新の needsReauth で再描画される
  }, [applyServerDetail, serverId, reauthSignal]);

  // PII マスキング切替: DB 更新（即時反映）。実プロキシへは次回 spawn 時に反映されるため
  // ユーザーへ「再起動後に反映」を案内する。失敗時は state をロールバック。
  const updateMasking = useCallback(
    (value: boolean): void => {
      const previous = maskingEnabled;
      setMaskingEnabled(value);
      window.electronAPI.mcp
        .updatePiiMasking({ serverId, enabled: value })
        .then(() => {
          toast.success(
            "マスキング設定を更新しました。MCPサーバーの再起動後に反映されます",
          );
        })
        .catch(() => {
          setMaskingEnabled(previous);
          toast.error("マスキング設定の更新に失敗しました");
        });
    },
    [maskingEnabled, serverId],
  );

  // レスポンス圧縮（TOON 変換）切替: DB 更新（即時反映）。実プロキシへは次回 spawn 時に反映される。
  // 失敗時は state をロールバックして元に戻す。
  const updateCompression = useCallback(
    (value: boolean): void => {
      const previous = compressionEnabled;
      setCompressionEnabled(value);
      window.electronAPI.mcp
        .updateToonConversion({ serverId, enabled: value })
        .then(() => {
          toast.success(
            "レスポンス圧縮設定を更新しました。MCPサーバーの再起動後に反映されます",
          );
        })
        .catch(() => {
          setCompressionEnabled(previous);
          toast.error("レスポンス圧縮設定の更新に失敗しました");
        });
    },
    [compressionEnabled, serverId],
  );

  const updateDynamicSearch = useCallback(
    (value: boolean): void => {
      const previous = dynamicSearchEnabled;
      setDynamicSearchEnabled(value);
      setDynamicSearchUpdating(true);
      setDynamicSearchError(null);
      window.electronAPI.mcp
        .updateDynamicSearch({ serverId, enabled: value })
        .then(() => {
          toast.success(
            "動的検索設定を更新しました。MCPサーバーの再起動後に反映されます",
          );
        })
        .catch(() => {
          setDynamicSearchEnabled(previous);
          setDynamicSearchError("動的検索設定の更新に失敗しました");
          toast.error("動的検索設定の更新に失敗しました");
        })
        .finally(() => setDynamicSearchUpdating(false));
    },
    [dynamicSearchEnabled, serverId],
  );

  const refreshTools = useCallback(async (): Promise<void> => {
    if (Number.isNaN(serverId) || toolsRefreshing) return;
    setToolsRefreshing(true);
    setToolsRefreshError(null);
    try {
      const result = await window.electronAPI.mcp.refreshTools({ serverId });
      const detail = await window.electronAPI.mcp.getDetail(serverId);
      applyServerDetail(detail);
      toast.success(
        `ツール一覧を再取得しました（対象 ${result.totalTools.toLocaleString()}件）`,
      );
    } catch {
      setToolsRefreshError("ツール一覧の再取得に失敗しました");
      toast.error("ツール一覧の再取得に失敗しました");
    } finally {
      setToolsRefreshing(false);
    }
  }, [applyServerDetail, serverId, toolsRefreshing]);

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

  // OAuth認証タイプのコネクト一覧（再認証対象）
  const oauthConnections: McpConnectionDetailItem[] =
    server?.connections.filter((conn) => conn.authType === "OAUTH") ?? [];
  const hasOAuthConnection = oauthConnections.length > 0;
  // refresh_token 失効を検知したコネクト（UI 上で「再認証が必要」バナーを出す対象）
  const needsReauthConnections = oauthConnections.filter(
    (conn) => conn.needsReauth,
  );

  // 再認証実行: IPC 呼び出し → 成功時にサーバー詳細を再取得 → トースト通知
  const runReauth = useCallback(
    async (connectionId: number): Promise<void> => {
      setReauthProcessing(true);
      try {
        await window.electronAPI.oauth.reauthenticate({ connectionId });
        toast.success(
          "OAuth再認証が完了しました。MCPサーバーの再起動後に新トークンが反映されます",
        );
        setShowReauthModal(false);
        // 最新の接続情報を取得してUI上の更新日時等を反映
        const detail = await window.electronAPI.mcp.getDetail(serverId);
        if (detail) setServer(detail);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OAuth再認証に失敗しました";
        toast.error(message);
      } finally {
        setReauthProcessing(false);
      }
    },
    [serverId],
  );

  // 再認証進行中にこの画面がアンマウントされた場合、main プロセス側で動いている
  // ループバックサーバーが残らないようにキャンセル IPC を呼ぶ
  useEffect(() => {
    return () => {
      if (reauthProcessing) {
        void window.electronAPI.oauth.cancelAuth();
      }
    };
  }, [reauthProcessing]);

  // 単一OAuthコネクトの場合は直接、複数ある場合はモーダルを開く。
  // ボタン自体が hasOAuthConnection 時のみ表示されるため length === 0 は到達不能。
  const handleRequestReauth = (): void => {
    setShowMenu(false);
    if (oauthConnections.length === 1 && oauthConnections[0]) {
      void runReauth(oauthConnections[0].id);
      return;
    }
    setShowReauthModal(true);
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:opacity-80 dark:text-zinc-500"
        >
          <ArrowLeft size={14} />
          コネクト
        </Link>
        <div className="mt-12 text-center text-sm text-gray-400 dark:text-zinc-600">
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:opacity-80 dark:text-zinc-500"
        >
          <ArrowLeft size={14} />
          コネクト
        </Link>
        <div className="mt-12 text-center text-sm text-gray-400 dark:text-zinc-600">
          サーバーが見つかりません
        </div>
      </div>
    );
  }

  const badge = serverStatusBadge[server.serverStatus] ?? {
    className:
      "bg-black/[.06] dark:bg-white/[.08] text-gray-500 dark:text-zinc-500",
    label: "停止中",
  };
  const primaryConnection = server.connections[0];
  // カスタムMCPのfavicon URL優先、なければカタログアイコンを使用
  const serverIcon =
    server.connections.find((c) => c.iconPath)?.iconPath ??
    server.connections.find((c) => c.catalog?.iconPath)?.catalog?.iconPath ??
    null;

  // 全接続からツールを集約（実データ）
  const allTools: DisplayTool[] = server.connections.flatMap((conn) =>
    conn.tools.map((tool) => ({ ...tool, connectionName: conn.name })),
  );
  // 実データが空ならサンプルツールで代替表示
  const isSampleTools = allTools.length === 0;
  const baseTools = isSampleTools ? SAMPLE_TOOLS : allTools;

  /** 選択クライアント向けの MCP 設定 JSON スニペット生成 */
  const buildConfigSnippet = (): string => {
    if (!launchCommand) return "起動コマンドを取得中...";
    // claude-code のみ .mcp.json 直下にサーバー名キーを置く形式、その他は mcpServers でラップする形式
    const format =
      selectedClient?.id === "claude-code" ? "claude-code" : "cursor";
    return buildMcpSnippet(launchCommand, server.slug, format, true);
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
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:opacity-80 dark:text-zinc-500"
      >
        <ArrowLeft size={14} />
        コネクト
      </Link>

      {/* 2カラムレイアウト: メインコンテンツ + 右サイドバー（接続先AI） 高さ合わせ、両側スクロール可 */}
      <div className="mt-4 flex max-h-[calc(100vh-10rem)] min-h-0 items-stretch gap-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
          {/* 再認証バナー: refresh_token が失効した OAuth コネクトがある場合のみ表示 */}
          {needsReauthConnections.length > 0 && (
            <div className="rounded-xl border border-red-400/40 bg-red-500/10 p-4 dark:border-red-400/30 dark:bg-red-500/10">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-red-500 dark:text-red-400"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-red-700 dark:text-red-200">
                    OAuth再認証が必要です
                  </p>
                  <p className="mt-1 text-xs text-red-600/90 dark:text-red-300/80">
                    {needsReauthConnections.length === 1
                      ? `「${needsReauthConnections[0]?.name ?? ""}」のリフレッシュトークンが失効しているため、MCPツールの呼び出しに失敗します。再認証してください。`
                      : `${String(needsReauthConnections.length)}件のコネクトでリフレッシュトークンが失効しているため、MCPツールの呼び出しに失敗します。再認証してください。`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {needsReauthConnections.map((conn) => (
                      <button
                        key={conn.id}
                        type="button"
                        onClick={() => void runReauth(conn.id)}
                        disabled={reauthProcessing}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
                      >
                        <KeyRound size={12} aria-hidden="true" />
                        {needsReauthConnections.length === 1
                          ? "再認証する"
                          : `${conn.name}を再認証`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* ヘッダーカード: サーバー概要 + 基本情報 + 機能設定 + 3点リーダー */}
          <div className={`rounded-xl p-5 ${cardStyle}`}>
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
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black/[.02] dark:bg-white/[.04]">
                    <Server
                      size={24}
                      className="text-gray-500 dark:text-zinc-500"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-bold text-gray-900 dark:text-white">
                      {server.name}
                    </h1>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {/* インライン統計（利用統計の大ボックスを吸収） */}
                    <div className="flex shrink-0 items-center gap-2 text-[11px] text-gray-500 dark:text-zinc-500">
                      <span className="text-gray-400 dark:text-zinc-600">
                        ·
                      </span>
                      <span title="総リクエスト">
                        <span className="font-mono text-gray-600 dark:text-zinc-400">
                          {auditTotal.toLocaleString()}
                        </span>
                        <span className="ml-0.5 text-gray-400 dark:text-zinc-600">
                          req
                        </span>
                      </span>
                      <span className="text-gray-400 dark:text-zinc-600">
                        ·
                      </span>
                      <span title="成功率">
                        <span className="font-mono text-gray-600 dark:text-zinc-400">
                          {successRate}
                        </span>
                        <span className="ml-0.5 text-gray-400 dark:text-zinc-600">
                          %
                        </span>
                      </span>
                      <span className="text-gray-400 dark:text-zinc-600">
                        ·
                      </span>
                      <span title="平均応答">
                        <span className="font-mono text-gray-600 dark:text-zinc-400">
                          {avgDurationMs}
                        </span>
                        <span className="ml-0.5 text-gray-400 dark:text-zinc-600">
                          ms
                        </span>
                      </span>
                    </div>
                  </div>
                  <p className="truncate text-sm text-gray-500 dark:text-zinc-500">
                    {server.description || server.slug}
                  </p>
                </div>
              </div>

              {/* 3点リーダーメニュー */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="rounded-lg p-1.5 text-gray-500 transition hover:bg-black/[.02] hover:text-gray-900 dark:text-zinc-500 dark:hover:bg-white/[.04] dark:hover:text-white"
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
                    <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-white/[.08] dark:bg-zinc-900">
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          setShowEditModal(true);
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-gray-600 transition hover:bg-black/[.02] hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-white/[.04] dark:hover:text-white"
                      >
                        サーバー設定を編集
                      </button>
                      {hasOAuthConnection && (
                        <button
                          type="button"
                          onClick={handleRequestReauth}
                          className="flex w-full items-center gap-2 border-t border-t-gray-100 px-4 py-2.5 text-left text-sm text-gray-600 transition hover:bg-black/[.02] hover:text-gray-900 dark:border-t-white/[.03] dark:text-zinc-400 dark:hover:bg-white/[.04] dark:hover:text-white"
                        >
                          <KeyRound size={14} />
                          OAuthを再設定
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 基本情報（インライン・ラベル+値） */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-t-gray-100 pt-3 text-xs dark:border-t-white/[.03]">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="text-gray-400 dark:text-zinc-600">接続先</span>
                <span className="truncate font-mono text-gray-600 dark:text-zinc-400">
                  {primaryConnection
                    ? primaryConnection.transportType === "STDIO"
                      ? (primaryConnection.command ?? "—")
                      : (primaryConnection.url ?? "—")
                    : "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 dark:text-zinc-600">
                  プロトコル
                </span>
                <span className="font-mono text-gray-600 dark:text-zinc-400">
                  {primaryConnection?.transportType ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 dark:text-zinc-600">追加日</span>
                <span className="text-gray-600 dark:text-zinc-400">
                  {new Date(server.createdAt).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 dark:text-zinc-600">識別子</span>
                <span className="font-mono text-gray-600 dark:text-zinc-400">
                  {server.slug}
                </span>
              </div>
            </div>

            {/* 機能設定（マスキング / 圧縮 / 動的検索） */}
            <div className="mt-4 border-t border-t-gray-100 pt-4 dark:border-t-white/[.03]">
              <div className="mb-2 text-xs font-medium text-gray-500 dark:text-zinc-500">
                機能設定
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                {/* マスキング / 圧縮(TOON) / dynamicSearch は DB 永続化 */}
                <div
                  title="機密情報を自動マスクします（再起動後に反映）"
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/[.02] px-3 py-2 dark:bg-white/[.04]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-gray-500 dark:text-zinc-500">
                      <EyeOff size={13} />
                    </span>
                    <span className="truncate text-xs text-gray-900 dark:text-white">
                      マスキング
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={maskingEnabled}
                    onChange={updateMasking}
                  />
                </div>
                <div
                  title="レスポンスを TOON 形式へ変換しトークン使用量を削減します（再起動後に反映）"
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/[.02] px-3 py-2 dark:bg-white/[.04]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-gray-500 dark:text-zinc-500">
                      <Archive size={13} />
                    </span>
                    <span className="truncate text-xs text-gray-900 dark:text-white">
                      レスポンス圧縮
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={compressionEnabled}
                    onChange={updateCompression}
                  />
                </div>
                <div
                  title={
                    dynamicSearchUpdating
                      ? "動的検索設定を更新中です"
                      : (dynamicSearchError ??
                        "ツールをオンデマンドで検索します")
                  }
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/[.02] px-3 py-2 dark:bg-white/[.04]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 text-gray-500 dark:text-zinc-500">
                      <SearchCode size={13} />
                    </span>
                    <span className="truncate text-xs text-gray-900 dark:text-white">
                      動的検索
                    </span>
                    {dynamicSearchUpdating && (
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-zinc-600">
                        更新中
                      </span>
                    )}
                  </div>
                  <ToggleSwitch
                    checked={dynamicSearchEnabled}
                    disabled={dynamicSearchUpdating}
                    onChange={updateDynamicSearch}
                  />
                </div>
              </div>
              {dynamicSearchError && (
                <p className="mt-2 text-[11px] text-red-500 dark:text-red-400">
                  {dynamicSearchError}
                </p>
              )}
            </div>
          </div>

          {/* 提供ツールカード */}
          <div
            className={`flex min-h-0 flex-1 flex-col rounded-xl p-4 ${cardStyle}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                提供ツール
                <span className="ml-2 text-xs text-gray-400 dark:text-zinc-600">
                  {baseTools.length}件
                  {isSampleTools && (
                    <span className="ml-1 rounded bg-black/[.06] px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/[.08] dark:text-zinc-500">
                      サンプル
                    </span>
                  )}
                </span>
              </h2>
              <button
                type="button"
                onClick={() => void refreshTools()}
                disabled={toolsRefreshing || server.connections.length === 0}
                title={
                  server.connections.length === 0
                    ? "再取得できるツールがありません"
                    : (toolsRefreshError ?? "ツール一覧を再取得します")
                }
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-600 transition hover:bg-black/[.02] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/[.08] dark:text-zinc-400 dark:hover:bg-white/[.04]"
              >
                <RefreshCw
                  size={12}
                  className={toolsRefreshing ? "animate-spin" : ""}
                />
                {toolsRefreshing ? "更新中" : "再取得"}
              </button>
            </div>
            {toolsRefreshError && (
              <p className="mb-2 text-[11px] text-red-500 dark:text-red-400">
                {toolsRefreshError}
              </p>
            )}
            <div className="relative mb-2">
              <Search
                size={12}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400 dark:text-zinc-600"
              />
              <input
                type="text"
                placeholder="ツールを検索..."
                value={toolQuery}
                onChange={(e) => setToolQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-black/[.02] py-1.5 pr-2 pl-8 text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:border-white/[.08] dark:bg-white/[.03] dark:text-white"
              />
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {filteredTools.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400 dark:text-zinc-600">
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
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-black/[.02] px-2.5 py-2 dark:border-white/[.03] dark:bg-white/[.04]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-xs font-medium text-gray-900 dark:text-white">
                          {displayName}
                        </div>
                        {displayDescription && (
                          <div className="mt-0.5 line-clamp-1 text-[10px] text-gray-500 dark:text-zinc-500">
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
          <div className={`flex h-full flex-col rounded-xl p-4 ${cardStyle}`}>
            <div className="mb-2 flex items-center gap-2 border-b border-b-gray-100 pb-2 dark:border-b-white/[.03]">
              <Plug size={13} className="text-gray-500 dark:text-zinc-500" />
              <h2 className="text-xs font-medium text-gray-900 dark:text-white">
                接続先AI
              </h2>
              <span className="ml-auto text-[10px] text-gray-400 dark:text-zinc-600">
                {AI_CLIENTS.length}件
              </span>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto pr-1">
              {AI_CLIENTS.map((client) => {
                const logo = client.logoPath?.("light");
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClient(client)}
                    className="flex w-full items-center gap-2 rounded-lg border border-gray-100 bg-black/[.02] px-2.5 py-1.5 text-left transition hover:border-gray-200 hover:bg-black/[.06] dark:border-white/[.08] dark:bg-white/[.08]"
                  >
                    {logo ? (
                      <div className="flex shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100/95 p-[2px]">
                        <img
                          src={logo}
                          alt={client.name}
                          className="h-4 w-4 rounded-lg object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-zinc-100/95 p-[2px] text-[8px] font-bold text-gray-500 dark:text-zinc-500">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <span className="flex-1 truncate text-[11px] text-gray-900 dark:text-white">
                      {client.name}
                    </span>
                    <ChevronRight
                      size={11}
                      className="shrink-0 text-gray-400 dark:text-zinc-600"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* 最近の操作（実データ: 監査ログ + フィルター + ページネーション） — サイドバーを超えてフル幅 */}
      <div className={`mt-4 rounded-xl p-6 ${cardStyle}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            最近の操作
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-gray-400 dark:text-zinc-600"
              />
              <input
                type="text"
                value={logQuery}
                onChange={(e) => setLogQuery(e.target.value)}
                placeholder="ツール・クライアント・内容で検索..."
                className="w-52 rounded-lg border border-gray-200 bg-black/[.02] py-1 pr-2 pl-7 text-xs text-gray-900 outline-none placeholder:text-gray-400 dark:border-white/[.08] dark:bg-white/[.03] dark:text-white"
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
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-zinc-400"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-zinc-400"
            />
          </div>
        </div>
        {auditLoading && auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-zinc-600">
            読み込み中...
          </p>
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
              const goPage = (p: number): void => {
                void loadAuditLogs(p);
              };
              const formatBytes = (n: number): string =>
                n >= 1024 ? `${(n / 1024).toFixed(1)} KB` : `${n} B`;
              return (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-white/[.03]">
                    <table className="w-full text-xs">
                      <thead className="bg-black/[.02] dark:bg-white/[.04]">
                        <tr className="text-left text-gray-500 dark:text-zinc-500">
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
                              className="px-3 py-6 text-center text-gray-400 dark:text-zinc-600"
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
                                    : "border-b border-b-gray-100 dark:border-b-white/[.03]"
                                }
                              >
                                <td className="px-3 py-2 whitespace-nowrap text-gray-400 dark:text-zinc-600">
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
                                      <span className="text-gray-500 dark:text-zinc-500">
                                        {log.clientName}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 dark:text-zinc-600">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 font-mono whitespace-nowrap text-gray-600 dark:text-zinc-400">
                                  {log.toolName}
                                </td>
                                <td
                                  className="max-w-[200px] truncate px-3 py-2 font-mono text-gray-400 dark:text-zinc-600"
                                  title={requestText}
                                >
                                  {requestText}
                                </td>
                                <td
                                  className="max-w-[200px] truncate px-3 py-2 font-mono text-gray-400 dark:text-zinc-600"
                                  title={responseText}
                                >
                                  {responseText}
                                </td>
                                <td className="px-3 py-2 text-right font-mono whitespace-nowrap text-gray-400 dark:text-zinc-600">
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
                  {auditTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 pt-3">
                      <button
                        type="button"
                        onClick={() => goPage(auditPage - 1)}
                        disabled={auditPage <= 1 || auditLoading}
                        className="rounded-lg px-2 py-1 text-xs text-gray-500 transition hover:opacity-80 disabled:opacity-30 dark:text-zinc-500"
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
                              className="px-1 text-xs text-gray-400 dark:text-zinc-600"
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
                                  ? "bg-gray-900 text-white dark:bg-white dark:text-black"
                                  : "text-gray-500 dark:text-zinc-500"
                              }`}
                            >
                              {p}
                            </button>
                          ),
                        )}
                      <button
                        type="button"
                        onClick={() => goPage(auditPage + 1)}
                        disabled={auditPage >= auditTotalPages || auditLoading}
                        className="rounded-lg px-2 py-1 text-xs text-gray-500 transition hover:opacity-80 disabled:opacity-30 dark:text-zinc-500"
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
          onClose={() => setSelectedClient(null)}
        />
      )}

      {/* OAuth再認証モーダル（仮想MCPで複数OAuthコネクトがある場合に表示） */}
      <OAuthReauthModal
        open={showReauthModal}
        connections={oauthConnections}
        isProcessing={reauthProcessing}
        onConfirm={(connectionId) => void runReauth(connectionId)}
        onCancel={() => {
          if (!reauthProcessing) setShowReauthModal(false);
        }}
      />

      {/* サーバー設定編集モーダル */}
      {showEditModal && (
        <EditMcpServerModal
          serverId={serverId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            // 保存成功時は詳細を再取得して画面に反映
            window.electronAPI.mcp
              .getDetail(serverId)
              .then((updated) => {
                if (updated) setServer(updated);
              })
              .catch(() => {
                // 取得失敗時もモーダルの onClose が走るためここでは握りつぶす
              });
          }}
        />
      )}
    </div>
  );
};
