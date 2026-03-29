import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Search, ArrowRight, Check } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, CATEGORIES } from "../data/mock";
import type { ToolStatus } from "../data/mock";

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
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
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
            className="w-full rounded-lg py-2 pr-3 pl-9 text-sm outline-none focus:border-white/[0.15]"
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
          className="rounded-lg px-3 py-2 text-sm outline-none focus:border-white/[0.15]"
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

      {/* 承認済みセクション */}
      {approvedTools.length > 0 && (
        <div>
          <h2
            className="mb-3 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            利用中のツール
          </h2>
          <div className="space-y-2">
            {approvedTools.map((tool) => (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="flex items-center justify-between rounded-lg px-4 py-3 transition hover:opacity-90"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={theme === "dark" ? tool.logoDark : tool.logoLight}
                      alt={tool.name}
                      className="h-8 w-8 rounded-md"
                    />
                    <span
                      className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${statusDotColor[tool.status]}`}
                    />
                  </div>
                  <div>
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {tool.name}
                    </span>
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--text-subtle)" }}
                    >
                      {tool.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Check size={14} className="text-emerald-400" />
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    利用中
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 申請可能セクション */}
      {unapprovedTools.length > 0 && (
        <div>
          <h2
            className="mb-3 text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            申請可能なツール
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {unapprovedTools.map((tool) => (
              <div
                key={tool.id}
                className="space-y-4 rounded-xl p-5"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: "var(--border)",
                  backgroundColor: "var(--bg-card)",
                }}
              >
                {/* カードヘッダー */}
                <div className="flex items-center gap-3">
                  <img
                    src={theme === "dark" ? tool.logoDark : tool.logoLight}
                    alt={tool.name}
                    className="h-10 w-10 rounded-lg"
                  />
                  <div>
                    <h3
                      className="text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {tool.name}
                    </h3>
                    <p
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {tool.description}
                    </p>
                  </div>
                </div>

                {/* 追加情報 */}
                <div className="space-y-2 text-xs">
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
                      <span style={{ color: "var(--text-subtle)" }}>
                        必要な承認
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {tool.requiredApproval}
                      </span>
                    </div>
                  )}
                  {tool.availableDepartments && (
                    <div className="flex justify-between">
                      <span style={{ color: "var(--text-subtle)" }}>
                        対象部署
                      </span>
                      <span style={{ color: "var(--text-secondary)" }}>
                        {tool.availableDepartments}
                      </span>
                    </div>
                  )}
                </div>

                {/* 申請ボタン */}
                <Link
                  to="/requests/new"
                  className="flex items-center gap-1 text-xs hover:opacity-80"
                  style={{ color: "var(--text-muted)" }}
                >
                  利用を申請
                  <ArrowRight size={12} />
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
