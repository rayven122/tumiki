import type { JSX } from "react";
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, ArrowLeft, Wrench } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";
import { AddMcpModal } from "../_components/AddMcpModal";
import { CatalogToolsModal } from "../_components/CatalogToolsModal";
import { toast } from "../_components/Toast";
import { cardStyle } from "../utils/theme-styles";
import { authTypeLabel } from "../../shared/catalog.helpers";
import { CATALOG_TOOLS_MOCK } from "../data/catalog-tools-mock";
import { DISCOVERY_ERROR_CODE } from "../../shared/oauth/discovery-error-codes";

/** 認証種別バッジスタイル */
const authBadgeColor: Record<
  CatalogItem["authType"],
  { bg: string; text: string }
> = {
  NONE: { bg: "var(--badge-success-bg)", text: "var(--badge-success-text)" },
  BEARER: { bg: "var(--badge-warn-bg)", text: "var(--badge-warn-text)" },
  API_KEY: { bg: "var(--badge-warn-bg)", text: "var(--badge-warn-text)" },
  OAUTH: { bg: "var(--badge-info-bg)", text: "var(--badge-info-text)" },
};

export const ToolCatalog = (): JSX.Element => {
  const navigate = useNavigate();
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(
    null,
  );
  const [dcrPrefill, setDcrPrefill] = useState(false);
  const [toolsModalCatalog, setToolsModalCatalog] =
    useState<CatalogItem | null>(null);

  // OAuth 直接フロー時のイベントリスナーがモーダル表示中の AddMcpModal と二重発火しないよう参照で最新状態を保持
  const modalOpenRef = useRef(false);
  useEffect(() => {
    modalOpenRef.current = selectedCatalog !== null;
  }, [selectedCatalog]);

  useEffect(() => {
    window.electronAPI.catalog
      .getAll()
      .then((items) =>
        // モック由来のツール情報を注入（将来 Prisma 拡張で不要化）
        items.map((item) => {
          const tools = CATALOG_TOOLS_MOCK[item.name];
          return tools
            ? { ...item, tools, toolCount: tools.length }
            : { ...item, toolCount: 0 };
        }),
      )
      .then(setCatalogs)
      .catch(() => setCatalogs([]))
      .finally(() => setLoading(false));
  }, []);

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
    // 認証なしは直接コネクタへ追加
    if (item.authType === "NONE") {
      try {
        const result = await window.electronAPI.mcp.createFromCatalog({
          catalogId: item.id,
          catalogName: item.name,
          description: item.description,
          transportType: item.transportType,
          command: item.command,
          args: item.args,
          url: item.url,
          credentialKeys: [],
          credentials: {},
          authType: item.authType,
        });
        toast.success(`${result.serverName}が正常に追加されました。`);
        navigate("/tools");
      } catch {
        toast.error("MCPサーバーの登録に失敗しました");
      }
      return;
    }
    // API Key / Bearer はモーダルで入力
    if (item.authType !== "OAUTH") {
      setDcrPrefill(false);
      setSelectedCatalog(item);
      return;
    }
    if (!item.url) {
      toast.error("このカタログには認証先URLが設定されていません");
      return;
    }
    // OAuth は認証ページへ直接リダイレクト
    try {
      await window.electronAPI.oauth.startAuth({
        catalogId: item.id,
        catalogName: item.name,
        description: item.description,
        transportType: item.transportType,
        command: item.command,
        args: item.args,
        url: item.url,
      });
      toast.success(`${item.name}の認証をブラウザで開始しました。`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "OAuth認証の開始に失敗しました";
      const codeMatch = message.match(/\[(\w+)]\s/);
      const code = codeMatch?.[1];
      // DCR 非対応サーバー: モーダルを開いて Client ID/Secret 手動入力
      if (code === DISCOVERY_ERROR_CODE.DCR_NOT_SUPPORTED) {
        setDcrPrefill(true);
        setSelectedCatalog(item);
        return;
      }
      const displayMessage = codeMatch
        ? message.slice((codeMatch.index ?? 0) + codeMatch[0].length)
        : message;
      toast.error(displayMessage);
    }
  };

  const lowerQuery = query.toLowerCase();
  const filtered = catalogs.filter(
    (c) =>
      query === "" ||
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.toLowerCase().includes(lowerQuery),
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--text-subtle)]">
        読み込み中...
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
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
            {filtered.map((item) => (
              <div
                key={item.id}
                className="flex flex-col rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={cardStyle}
              >
                {/* アイコン + 認証種別 */}
                <div className="mb-3 flex items-start justify-between">
                  {item.iconPath ? (
                    <img
                      src={item.iconPath}
                      alt={item.name}
                      className="h-8 w-8 rounded-lg"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-xs text-gray-400">
                      MCP
                    </div>
                  )}
                  <span
                    className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                    style={{
                      backgroundColor: authBadgeColor[item.authType].bg,
                      color: authBadgeColor[item.authType].text,
                    }}
                  >
                    {authTypeLabel[item.authType]}
                  </span>
                </div>
                {/* 名前 */}
                <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">
                  {item.name}
                </div>
                {/* 利用可能なツール バッジ（クリックでモーダル） */}
                <button
                  type="button"
                  onClick={() => setToolsModalCatalog(item)}
                  disabled={!item.tools || item.tools.length === 0}
                  className="mb-3 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2 text-[10px] text-[var(--text-muted)] transition hover:border-[var(--border)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:text-[var(--text-muted)]"
                >
                  <span className="flex items-center gap-1.5">
                    <Wrench size={12} />
                    利用可能なツール
                  </span>
                  <span className="font-mono">{item.toolCount ?? 0}</span>
                </button>
                {/* 説明 */}
                <div className="mb-3 line-clamp-2 text-[10px] leading-relaxed text-[var(--text-subtle)]">
                  {item.description}
                </div>
                {/* 追加ボタン（OAuth は直接認証、それ以外はモーダル） */}
                <button
                  type="button"
                  onClick={() => void handleAddClick(item)}
                  className="mt-auto flex w-full items-center justify-center gap-1 rounded-md bg-[var(--text-primary)] py-1.5 text-[10px] font-medium text-[var(--bg-card)] transition hover:opacity-90"
                >
                  <Plus size={10} />
                  追加
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="py-12 text-center text-sm text-[var(--text-subtle)]">
          条件に一致するツールが見つかりません
        </div>
      )}

      {/* 追加モーダル */}
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

      {/* 利用可能ツールモーダル */}
      {toolsModalCatalog && toolsModalCatalog.tools && (
        <CatalogToolsModal
          catalogName={toolsModalCatalog.name}
          tools={toolsModalCatalog.tools}
          onClose={() => setToolsModalCatalog(null)}
        />
      )}
    </div>
  );
};
