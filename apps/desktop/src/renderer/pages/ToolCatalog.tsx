import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Search, Plus, Settings } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, CATEGORIES } from "../data/mock";
import type { ToolStatus } from "../data/mock";
import { cardStyle } from "../utils/theme-styles";

/** ステータスドット色 */
const statusDotColor: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

export const ToolCatalog = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("すべて");

  // 承認済み / 未承認で分離
  const allFiltered = TOOLS.filter((t) => {
    const matchesQuery =
      query === "" ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.includes(query);
    const matchesCategory = category === "すべて" || t.category === category;
    return matchesQuery && matchesCategory;
  });

  const approvedTools = allFiltered.filter((t) => t.approved);
  const unapprovedTools = allFiltered.filter((t) => !t.approved);

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
        {/* 検索バー */}
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
            style={{
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-card)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* カテゴリフィルタ */}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
            color: "var(--text-secondary)",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* 承認済みセクション（カードグリッド） */}
      {approvedTools.length > 0 && (
        <div>
          <div
            className="mb-4 flex items-center justify-between pb-2"
            style={{
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--border)",
            }}
          >
            <h2
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              利用中のツール
            </h2>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {approvedTools.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {approvedTools.map((tool) => (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={cardStyle}
              >
                {/* ロゴ + ステータスドット */}
                <div className="mb-3 flex items-start justify-between">
                  <img
                    src={theme === "dark" ? tool.logoDark : tool.logoLight}
                    alt={tool.name}
                    className="h-8 w-8 rounded-lg"
                  />
                  <span
                    className={`h-2 w-2 rounded-full ${statusDotColor[tool.status]}`}
                  />
                </div>
                {/* 名前 */}
                <div
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tool.name}
                </div>
                {/* カテゴリ */}
                <div
                  className="mb-3 text-[10px] leading-relaxed"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {tool.category}
                </div>
                {/* フッター */}
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-[9px]"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {tool.operations.length} tools
                  </span>
                  <span
                    className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] font-medium"
                    style={{
                      backgroundColor: "var(--bg-card-hover)",
                      color: "var(--text-muted)",
                    }}
                  >
                    <Settings size={10} />
                    管理
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 申請可能セクション（LP風カード） */}
      {unapprovedTools.length > 0 && (
        <div>
          <div
            className="mb-4 flex items-center justify-between pb-2"
            style={{
              borderBottomWidth: 1,
              borderBottomStyle: "solid",
              borderBottomColor: "var(--border)",
            }}
          >
            <h2
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              申請可能なツール
            </h2>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {unapprovedTools.length}件
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {unapprovedTools.map((tool) => (
              <div
                key={tool.id}
                className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={cardStyle}
              >
                {/* ロゴ */}
                <div className="mb-3">
                  <img
                    src={theme === "dark" ? tool.logoDark : tool.logoLight}
                    alt={tool.name}
                    className="h-8 w-8 rounded-lg"
                  />
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
                  className="mb-3 text-[10px] leading-relaxed"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {tool.description}
                </div>

                {/* 追加情報 */}
                <div className="mb-3 space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span style={{ color: "var(--text-subtle)" }}>
                      カテゴリ
                    </span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {tool.category}
                    </span>
                  </div>
                  {tool.requiredApproval && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-subtle)" }}>承認</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {tool.requiredApproval}
                      </span>
                    </div>
                  )}
                  {tool.availableDepartments && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-subtle)" }}>対象</span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {tool.availableDepartments}
                      </span>
                    </div>
                  )}
                </div>

                {/* 申請ボタン（LP風の白ボタン） */}
                <Link
                  to="/requests/new"
                  className="flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition hover:opacity-90"
                  style={{
                    backgroundColor: "var(--text-primary)",
                    color: "var(--bg-card)",
                  }}
                >
                  <Plus size={10} />
                  申請
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
