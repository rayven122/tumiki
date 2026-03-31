import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Search, Plus } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, CATEGORIES } from "../data/mock";
import type { Tool, ToolStatus, AuthType } from "../data/mock";
import {
  cardStyle,
  selectStyle,
  inputStyle,
  sectionBorderStyle,
  authBadgeStyle,
} from "../utils/theme-styles";

/** ステータスドット色 */
const statusDotColor: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

/** 認証種別ラベル */
const authTypeLabel: Record<AuthType, string> = {
  NONE: "設定不要",
  API_KEY: "API Key",
  OAuth: "OAuth",
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

/** テーマに応じたロゴURLを返す */
const toolLogo = (tool: Tool, theme: string): string =>
  theme === "dark" ? tool.logoDark : tool.logoLight;

/** 認証種別バッジ */
const AuthBadge = ({ authType }: { authType: AuthType }): JSX.Element => (
  <span
    className="rounded-full px-2 py-0.5 text-[9px] font-medium"
    style={authBadgeStyle(authType)}
  >
    {authTypeLabel[authType]}
  </span>
);

export const ToolCatalog = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("すべて");

  const lowerQuery = query.toLowerCase();
  const allFiltered = TOOLS.filter((t) => {
    const matchesQuery =
      query === "" ||
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.includes(query);
    const matchesCategory = category === "すべて" || t.category === category;
    return matchesQuery && matchesCategory;
  });

  const approvedTools = allFiltered.filter((t) => t.approved);

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
          組織で利用可能なツールを検索・申請できます
        </p>
      </div>

      {/* フィルタ */}
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

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={selectStyle}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 承認済みセクション */}
      {approvedTools.length > 0 && (
        <div>
          <SectionHeader title="利用中のツール" count={approvedTools.length} />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {approvedTools.map((tool) => (
              <div
                key={tool.id}
                className="flex flex-col rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={cardStyle}
              >
                {/* ロゴ + 認証種別 + ステータス */}
                <div className="mb-3 flex items-start justify-between">
                  <img
                    src={toolLogo(tool, theme)}
                    alt={tool.name}
                    className="h-8 w-8 rounded-lg"
                  />
                  <div className="flex items-center gap-1.5">
                    <AuthBadge authType={tool.authType} />
                    <span
                      className={`h-2 w-2 rounded-full ${statusDotColor[tool.status]}`}
                    />
                  </div>
                </div>
                {/* 名前 */}
                <div
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tool.name}
                </div>
                {/* 説明 */}
                <div
                  className="mb-3 line-clamp-2 text-[10px] leading-relaxed"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {tool.description}
                </div>
                {/* 追加ボタン */}
                <Link
                  to={`/tools/${tool.id}`}
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

      {allFiltered.length === 0 && (
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
