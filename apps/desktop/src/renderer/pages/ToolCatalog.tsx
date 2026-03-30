import type { JSX } from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import type { CatalogItem } from "../../types/catalog";
import {
  cardStyle,
  inputStyle,
  sectionBorderStyle,
  authBadgeStyle,
} from "../utils/theme-styles";

/** 認証種別ラベル */
const authTypeLabel: Record<CatalogItem["authType"], string> = {
  NONE: "設定不要",
  BEARER: "Bearer",
  API_KEY: "API Key",
  OAUTH: "OAuth",
};

/** セクション見出し */
const SectionHeader = ({
  title,
  count,
}: {
  title: string;
  count: number;
}): JSX.Element => (
  <div
    className="mb-4 flex items-center justify-between pb-2"
    style={sectionBorderStyle}
  >
    <h2 className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
      {title}
    </h2>
    <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
      {count}件
    </span>
  </div>
);

/** 認証種別バッジ */
const AuthBadge = ({
  authType,
}: {
  authType: CatalogItem["authType"];
}): JSX.Element => (
  <span
    className="rounded-full px-2 py-0.5 text-[9px] font-medium"
    style={authBadgeStyle(authType)}
  >
    {authTypeLabel[authType]}
  </span>
);

export const ToolCatalog = (): JSX.Element => {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    window.electronAPI.catalog
      .getAll()
      .then(setCatalogs)
      .catch(() => setCatalogs([]))
      .finally(() => setLoading(false));
  }, []);

  const lowerQuery = query.toLowerCase();
  const filtered = catalogs.filter(
    (c) =>
      query === "" ||
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description.includes(query),
  );

  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center text-sm"
        style={{ color: "var(--text-subtle)" }}
      >
        読み込み中...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          ツールカタログ
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          利用可能なMCPサーバーを検索・追加できます
        </p>
      </div>

      {/* 検索バー */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2"
            style={{ color: "var(--text-subtle)" }}
          />
          <input
            type="text"
            placeholder="ツールを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-lg py-2 pr-3 pl-9 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>

      {/* カタログ一覧 */}
      {filtered.length > 0 && (
        <div>
          <SectionHeader title="MCPカタログ" count={filtered.length} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
                  <AuthBadge authType={item.authType} />
                </div>
                {/* 名前 */}
                <div
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.name}
                </div>
                {/* 説明 */}
                <div
                  className="mb-3 line-clamp-2 text-[10px] leading-relaxed"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {item.description}
                </div>
                {/* 追加ボタン */}
                <Link
                  to={`/tools/catalog/${item.id}`}
                  className="mt-auto flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition hover:opacity-90"
                  style={{
                    backgroundColor: "var(--text-primary)",
                    color: "var(--bg-card)",
                  }}
                >
                  <Plus size={10} />
                  追加
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div
          className="py-12 text-center text-sm"
          style={{ color: "var(--text-subtle)" }}
        >
          条件に一致するツールが見つかりません
        </div>
      )}
    </div>
  );
};
