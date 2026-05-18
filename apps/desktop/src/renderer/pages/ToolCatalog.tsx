import type { JSX } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, ArrowLeft, RefreshCcw } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";
import { AddMcpModal } from "../_components/AddMcpModal";
import { AddCustomMcpModal } from "../_components/AddCustomMcpModal";
import { toast } from "../_components/Toast";
import { cardStyle } from "../utils/theme-styles";
import { authTypeLabel } from "../../shared/catalog.helpers";
import { getThemeIconUrl } from "../utils/theme-icon-url";

/** 認証種別バッジスタイル */
const authBadgeClass: Record<CatalogItem["authType"], string> = {
  NONE: "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  BEARER:
    "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
  API_KEY:
    "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
  OAUTH: "bg-blue-600/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400",
};

/** フィルター用の認証種別定義 */
const AUTH_TYPE_FILTERS = [
  { value: "OAUTH", label: "OAuth" },
  { value: "API_KEY", label: "API Key" },
  { value: "BEARER", label: "Bearer" },
  { value: "NONE", label: "設定不要" },
] as const;

const statusLabel: Record<CatalogItem["status"], string> = {
  available: "利用可能",
  request_required: "申請が必要",
  disabled: "利用不可",
};

const statusBadgeClass: Record<CatalogItem["status"], string> = {
  available:
    "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400",
  request_required:
    "bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400",
  disabled: "bg-red-500/10 dark:bg-red-400/10 text-red-600 dark:text-red-400",
};

const canAddCatalog = (item: CatalogItem) =>
  item.status === "available" && item.permissions.execute;

const addButtonLabel = (item: CatalogItem) => {
  if (item.status === "request_required") return "申請が必要";
  if (item.status === "disabled") return "利用不可";
  if (!item.permissions.execute) return "実行権限なし";
  return "追加";
};

export const ToolCatalog = (): JSX.Element => {
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedAuthTypes, setSelectedAuthTypes] = useState<
    CatalogItem["authType"][]
  >([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(
    null,
  );
  const [dcrPrefill, setDcrPrefill] = useState(false);
  const [cachedOAuthClient, setCachedOAuthClient] = useState<{
    clientId: string;
    clientSecret: string | null;
  } | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);

  // OAuth 直接フロー時のイベントリスナーがモーダル表示中の AddMcpModal / AddCustomMcpModal と二重発火しないよう参照で最新状態を保持
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = selectedCatalog !== null || showCustomModal;
  }, [selectedCatalog, showCustomModal]);

  const loadCatalogs = useCallback((): void => {
    setLoading(true);
    setLoadError(null);
    window.electronAPI.catalog
      .getAll()
      .then(setCatalogs)
      .catch((err: unknown) => {
        setCatalogs([]);
        setLoadError(
          err instanceof Error
            ? err.message
            : "カタログ一覧の取得に失敗しました",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // OAuth グローバルリスナー（AddMcpModal が開いていない時のフォールバック）
  useEffect(() => {
    const unsubSuccess = window.electronAPI.oauth.onOAuthSuccess((result) => {
      if (modalOpenRef.current) return;
      toast.success(`${result.serverName}が正常に追加されました。`);
      navigate("/tools");
    });
    const unsubError = window.electronAPI.oauth.onOAuthError((err) => {
      if (modalOpenRef.current) return;
      toast.error(err);
    });
    return () => {
      unsubSuccess();
      unsubError();
    };
  }, [navigate]);

  const handleAddClick = async (item: CatalogItem): Promise<void> => {
    if (!canAddCatalog(item)) return;
    const template = item.connectionTemplate;

    if (template.authType === "OAUTH") {
      if (!template.url) {
        toast.error("このカタログには認証先URLが設定されていません");
        return;
      }
      // キャッシュ済み手動入力クライアントがあればプリフィル
      let cachedClient: {
        clientId: string;
        clientSecret: string | null;
      } | null = null;
      try {
        cachedClient = await window.electronAPI.oauth.findManualOAuthClient(
          template.url,
        );
      } catch {
        // キャッシュ取得失敗時はプリフィルなしでモーダル表示
      }
      if (cachedClient) {
        setCachedOAuthClient(cachedClient);
        setDcrPrefill(true);
      } else {
        setCachedOAuthClient(null);
        setDcrPrefill(false);
      }
    } else {
      setDcrPrefill(false);
    }

    setSelectedCatalog(item);
  };

  const toggleAuthType = (authType: CatalogItem["authType"]): void => {
    setSelectedAuthTypes((prev) =>
      prev.includes(authType)
        ? prev.filter((t) => t !== authType)
        : [...prev, authType],
    );
  };

  const clearAllFilters = (): void => {
    setQuery("");
    setSelectedAuthTypes([]);
  };

  const hasActiveFilters = query !== "" || selectedAuthTypes.length > 0;

  const lowerQuery = query.toLowerCase();
  const filtered = catalogs.filter((c) => {
    const matchesSearch =
      query === "" ||
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery);

    const matchesAuthType =
      selectedAuthTypes.length === 0 || selectedAuthTypes.includes(c.authType);

    return matchesSearch && matchesAuthType;
  });

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400 dark:text-zinc-600">
        読み込み中...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-white/[.08] dark:bg-zinc-900">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            カタログの取得に失敗しました
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-zinc-500">
            {loadError}
          </p>
          <button
            type="button"
            onClick={loadCatalogs}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-zinc-900"
          >
            <RefreshCcw size={14} />
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ツールカタログ
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-zinc-500">
            利用可能なMCPサーバーを検索・追加できます
          </p>
        </div>
        <Link
          to="/tools"
          className="flex items-center gap-1 text-xs text-gray-500 transition-opacity hover:opacity-80 dark:text-zinc-500"
        >
          <ArrowLeft size={12} />
          コネクトに戻る
        </Link>
      </div>

      {/* 検索バー */}
      <div className="space-y-3">
        <div className="relative min-w-[200px]">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 dark:text-zinc-600"
          />
          <input
            type="text"
            placeholder="ツールを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-900 outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-white"
          />
        </div>

        {/* 認証種別フィルター */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-zinc-600">
            認証種別:
          </span>
          {AUTH_TYPE_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={selectedAuthTypes.includes(value)}
              onClick={() => toggleAuthType(value)}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                selectedAuthTypes.includes(value)
                  ? `${authBadgeClass[value]} ring-1 ring-gray-300 dark:ring-zinc-700`
                  : "bg-white text-gray-500 ring-1 ring-gray-200 hover:ring-gray-400 dark:bg-zinc-900 dark:text-zinc-500 dark:ring-white/[.08] dark:hover:ring-zinc-600"
              }`}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-1 text-[10px] text-gray-500 transition-opacity hover:opacity-70 dark:text-zinc-500"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* カタログ一覧 */}
      {filtered.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-b-gray-200 pb-2 dark:border-b-white/[.08]">
            <h2 className="text-sm font-medium text-gray-500 dark:text-zinc-500">
              MCPカタログ
            </h2>
            <span className="text-[10px] text-gray-400 dark:text-zinc-600">
              {filtered.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {/* カスタムMCPを追加カード */}
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 p-4 transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-lg dark:border-white/[.08] dark:hover:border-zinc-600"
            >
              <Plus
                size={28}
                className="mb-2 text-gray-400 dark:text-zinc-600"
              />
              <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                カスタムMCPを追加
              </span>
              <span className="mt-1 text-[10px] text-gray-400 dark:text-zinc-600">
                URLを指定してリモートMCPを登録
              </span>
            </button>
            {filtered.map((item) => {
              const template = item.connectionTemplate;
              const addable = canAddCatalog(item);
              return (
                <div
                  key={item.id}
                  className={`flex flex-col rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${cardStyle}`}
                >
                  {/* アイコン + 認証種別 */}
                  <div className="mb-3 flex items-start justify-between">
                    {item.iconUrl ? (
                      <div className="flex items-center justify-center overflow-hidden rounded-lg bg-zinc-100/50 p-2">
                        <img
                          src={getThemeIconUrl(item.iconUrl, "light")}
                          alt={item.name}
                          className="h-8 w-8 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100/50 p-2 text-xs text-zinc-400 dark:text-zinc-500">
                        MCP
                      </div>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${authBadgeClass[template.authType]}`}
                    >
                      {authTypeLabel[template.authType]}
                    </span>
                  </div>
                  <div className="mb-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${statusBadgeClass[item.status]}`}
                    >
                      {statusLabel[item.status]}
                    </span>
                  </div>
                  {/* 名前 */}
                  <div className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </div>
                  {/* 説明 */}
                  <div className="mb-3 line-clamp-2 text-[10px] leading-relaxed text-gray-400 dark:text-zinc-600">
                    {item.description}
                  </div>
                  {/* 追加ボタン */}
                  <button
                    type="button"
                    onClick={() => void handleAddClick(item)}
                    disabled={!addable}
                    className="mt-auto flex w-full items-center justify-center gap-1 rounded-md bg-gray-900 py-1.5 text-[10px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900"
                  >
                    {addable && <Plus size={10} />}
                    {addButtonLabel(item)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-gray-400 dark:text-zinc-600">
          <p>条件に一致するツールが見つかりません</p>
          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-zinc-900"
          >
            <Plus size={14} />
            カスタムMCPを追加
          </button>
        </div>
      )}

      {/* リモートMCP追加モーダル */}
      {showCustomModal && (
        <AddCustomMcpModal
          onClose={() => setShowCustomModal(false)}
          onSuccess={(serverName) => {
            setShowCustomModal(false);
            toast.success(`${serverName}が正常に追加されました。`);
            navigate("/tools");
          }}
        />
      )}

      {/* カタログからの追加モーダル */}
      {selectedCatalog && (
        <AddMcpModal
          catalog={selectedCatalog}
          initialNeedsManualOAuthClient={dcrPrefill}
          initialOAuthClientId={cachedOAuthClient?.clientId}
          initialOAuthClientSecret={
            cachedOAuthClient?.clientSecret ?? undefined
          }
          onClose={() => {
            setSelectedCatalog(null);
            setDcrPrefill(false);
            setCachedOAuthClient(null);
          }}
          onSuccess={(serverName) => {
            setSelectedCatalog(null);
            setDcrPrefill(false);
            setCachedOAuthClient(null);
            toast.success(`${serverName}が正常に追加されました。`);
            navigate("/tools");
          }}
        />
      )}
    </div>
  );
};
