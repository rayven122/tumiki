import type { JSX } from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, ArrowLeft, RefreshCcw } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";
import { AddMcpModal } from "../_components/AddMcpModal";
import { AddRemoteMcpModal } from "../_components/AddRemoteMcpModal";
import { toast } from "../_components/Toast";
import { cardStyle } from "../utils/theme-styles";
import { authTypeLabel } from "../../shared/catalog.helpers";
import {
  DISCOVERY_ERROR_CODE,
  extractOAuthErrorCode,
} from "../../shared/oauth/discovery-error-codes";

/** 認証種別バッジスタイル */
const authBadgeClass: Record<CatalogItem["authType"], string> = {
  NONE: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
  BEARER: "bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)]",
  API_KEY: "bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)]",
  OAUTH: "bg-[var(--badge-info-bg)] text-[var(--badge-info-text)]",
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
  available: "bg-[var(--badge-success-bg)] text-[var(--badge-success-text)]",
  request_required: "bg-[var(--badge-warn-bg)] text-[var(--badge-warn-text)]",
  disabled: "bg-[var(--badge-error-bg)] text-[var(--badge-error-text)]",
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
  const [showRemoteModal, setShowRemoteModal] = useState(false);

  // OAuth 直接フロー時のイベントリスナーがモーダル表示中の AddMcpModal / AddRemoteMcpModal と二重発火しないよう参照で最新状態を保持
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = selectedCatalog !== null || showRemoteModal;
  }, [selectedCatalog, showRemoteModal]);

  const loadCatalogs = useCallback((): void => {
    setLoading(true);
    setLoadError(null);
    window.electronAPI.catalog
      .getAll()
      .then(setCatalogs)
      .catch(() => {
        setCatalogs([]);
        setLoadError("管理サーバーのカタログ取得に失敗しました");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  // OAuth 直接フロー用のグローバルリスナー（AddMcpModal が開いている時は内部リスナーに任せる）
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
    // 認証なしは直接コネクタへ追加
    if (template.authType === "NONE") {
      try {
        const result = await window.electronAPI.mcp.createFromManagerCatalog({
          catalogId: item.id,
          serverName: item.name,
          description: item.description,
          status: item.status,
          permissions: item.permissions,
          connectionTemplate: template,
          tools: item.tools.map((tool) => ({
            name: tool.name,
            allowed: tool.allowed,
          })),
          credentials: {},
        });
        toast.success(`${result.serverName}が正常に追加されました。`);
        navigate("/tools");
      } catch {
        toast.error("MCPサーバーの登録に失敗しました");
      }
      return;
    }
    // API Key / Bearer はモーダルで入力
    if (template.authType !== "OAUTH") {
      setDcrPrefill(false);
      setSelectedCatalog(item);
      return;
    }
    if (!template.url) {
      toast.error("このカタログには認証先URLが設定されていません");
      return;
    }
    // OAuth は認証ページへ直接リダイレクト
    try {
      await window.electronAPI.oauth.startAuth({
        catalogName: item.name,
        description: item.description,
        transportType: template.transportType,
        command: template.command,
        args: JSON.stringify(template.args),
        url: template.url,
        managerCatalog: {
          catalogId: item.id,
          status: item.status,
          permissions: item.permissions,
          connectionTemplate: template,
          tools: item.tools.map((tool) => ({
            name: tool.name,
            allowed: tool.allowed,
          })),
        },
      });
      toast.success(`${item.name}の認証をブラウザで開始しました。`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth認証の開始に失敗しました";
      const { code, displayMessage } = extractOAuthErrorCode(message);
      if (code === DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED) {
        setDcrPrefill(true);
        setSelectedCatalog(item);
        return;
      }
      toast.error(displayMessage);
    }
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
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-subtle)]">
        読み込み中...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            管理サーバーのカタログ取得に失敗しました
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            管理サーバーへの接続状態、ログイン状態、ネットワークを確認してください。
          </p>
          <button
            type="button"
            onClick={loadCatalogs}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-card)] transition hover:opacity-90"
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            ツールカタログ
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            利用可能なMCPサーバーを検索・追加できます
          </p>
        </div>
        <Link
          to="/tools"
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] transition-opacity hover:opacity-80"
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
            className="absolute top-1/2 left-3 -translate-y-1/2 text-[var(--text-subtle)]"
          />
          <input
            type="text"
            placeholder="ツールを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-card)] py-2 pr-3 pl-9 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        {/* 認証種別フィルター */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-[var(--text-subtle)]">
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
                  ? `${authBadgeClass[value]} ring-1 ring-[var(--text-muted)]`
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] ring-1 ring-[var(--border)] hover:ring-[var(--text-subtle)]"
              }`}
            >
              {label}
            </button>
          ))}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-1 text-[10px] text-[var(--text-muted)] transition-opacity hover:opacity-70"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* カタログ一覧 */}
      {filtered.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between border-b border-b-[var(--border)] pb-2">
            <h2 className="text-sm font-medium text-[var(--text-muted)]">
              MCPカタログ
            </h2>
            <span className="text-[10px] text-[var(--text-subtle)]">
              {filtered.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {/* カスタムMCPを追加カード */}
            <button
              type="button"
              onClick={() => setShowRemoteModal(true)}
              className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--text-muted)] hover:shadow-lg"
            >
              <Plus size={28} className="mb-2 text-[var(--text-subtle)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                カスタムMCPを追加
              </span>
              <span className="mt-1 text-[10px] text-[var(--text-subtle)]">
                URLを指定してリモートMCPを登録
              </span>
            </button>
            {filtered.map((item) => {
              const template = item.connectionTemplate;
              const addable = canAddCatalog(item);
              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={cardStyle}
                >
                  {/* アイコン + 認証種別 */}
                  <div className="mb-3 flex items-start justify-between">
                    {item.iconUrl ? (
                      <img
                        src={item.iconUrl}
                        alt={item.name}
                        className="h-8 w-8 rounded-lg"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-xs text-gray-400">
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
                  <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                    {item.name}
                  </div>
                  {/* 説明 */}
                  <div className="mb-3 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-subtle)]">
                    {item.description}
                  </div>
                  {/* 追加ボタン（OAuth は直接認証、それ以外はモーダル） */}
                  <button
                    type="button"
                    onClick={() => void handleAddClick(item)}
                    disabled={!addable}
                    className="mt-auto flex w-full items-center justify-center gap-1 rounded-md bg-[var(--text-primary)] py-1.5 text-[10px] font-medium text-[var(--bg-card)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="py-12 text-center text-sm text-[var(--text-subtle)]">
          <p>条件に一致するツールが見つかりません</p>
          <button
            type="button"
            onClick={() => setShowRemoteModal(true)}
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-card)] transition hover:opacity-90"
          >
            <Plus size={14} />
            カスタムMCPを追加
          </button>
        </div>
      )}

      {/* リモートMCP追加モーダル */}
      {showRemoteModal && (
        <AddRemoteMcpModal
          onClose={() => setShowRemoteModal(false)}
          onSuccess={(serverName) => {
            setShowRemoteModal(false);
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
          onClose={() => {
            setSelectedCatalog(null);
            setDcrPrefill(false);
          }}
          onSuccess={(serverName) => {
            setSelectedCatalog(null);
            setDcrPrefill(false);
            toast.success(`${serverName}が正常に追加されました。`);
            navigate("/tools");
          }}
        />
      )}
    </div>
  );
};
