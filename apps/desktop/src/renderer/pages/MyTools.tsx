import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { TOOLS, CATEGORIES } from "../data/mock";
import type { ToolStatus } from "../data/mock";

/** ツールIDとロゴパスのマッピング */
const TOOL_LOGOS: Record<string, string> = {
  slack: "/logos/services/slack.webp",
  jira: "/logos/services/database.webp",
  github: "/logos/services/github.webp",
  esa: "/logos/services/notion.webp",
  "google-drive": "/logos/services/google-drive.svg",
  salesforce: "/logos/services/database.webp",
  freee: "/logos/services/database.webp",
};

/** ステータス表示定義 */
const STATUS_CONFIG: Record<
  ToolStatus,
  { dotClass: string; label: string; borderStyle: string }
> = {
  active: {
    dotClass: "bg-emerald-400",
    label: "稼働中",
    borderStyle: "rgba(52, 211, 153, 0.2)",
  },
  degraded: {
    dotClass: "bg-amber-400",
    label: "応答遅延",
    borderStyle: "rgba(251, 191, 36, 0.2)",
  },
  down: {
    dotClass: "bg-red-400",
    label: "停止中",
    borderStyle: "rgba(248, 113, 113, 0.2)",
  },
};

export const MyTools = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("すべて");
  const [statusFilter, setStatusFilter] = useState<ToolStatus | "all">("all");

  const approvedTools = TOOLS.filter((t) => t.approved);

  const filteredTools = approvedTools.filter((t) => {
    const matchesQuery =
      query === "" ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.includes(query);
    const matchesCategory = category === "すべて" || t.category === category;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesQuery && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-5">
      {/* ウィンドウ風コンテナ */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* ウィンドウバー（LP風） */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "var(--text-subtle)" }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "var(--text-subtle)" }}
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: "var(--text-subtle)" }}
              />
            </div>
            <span
              className="ml-2 text-xs"
              style={{ color: "var(--text-subtle)" }}
            >
              tumiki — マイツール
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="text-[10px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {filteredTools.length}件表示
            </span>
            <Link
              to="/tools/catalog"
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] transition-opacity hover:opacity-80"
              style={{
                backgroundColor: "var(--bg-active)",
                color: "var(--text-muted)",
              }}
            >
              カタログ
              <ArrowRight size={10} />
            </Link>
          </div>
        </div>

        {/* フィルタバー */}
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="relative min-w-[180px] flex-1">
            <Search
              size={13}
              className="absolute top-1/2 left-2.5 -translate-y-1/2"
              style={{ color: "var(--text-subtle)" }}
            />
            <input
              type="text"
              placeholder="ツールを検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg py-1.5 pr-3 pl-8 text-xs outline-none"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-input)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-secondary)",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ToolStatus | "all")
            }
            className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-secondary)",
            }}
          >
            <option value="all">すべて</option>
            <option value="active">稼働中</option>
            <option value="degraded">応答遅延</option>
            <option value="down">停止中</option>
          </select>
        </div>

        {/* ツールカードグリッド（LP Connector風） */}
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          {filteredTools.map((tool) => {
            const status = STATUS_CONFIG[tool.status];
            const logo = TOOL_LOGOS[tool.id];
            const allowedOps = tool.operations.filter((o) => o.allowed).length;
            return (
              <Link
                key={tool.id}
                to={`/tools/${tool.id}`}
                className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  border: `1px solid ${status.borderStyle}`,
                  backgroundColor: "var(--bg-card)",
                }}
              >
                {/* ロゴ + ステータスドット */}
                <div className="mb-3 flex items-start justify-between">
                  {logo ? (
                    <img
                      src={logo}
                      alt={tool.name}
                      className="h-8 w-8 rounded-lg"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-semibold"
                      style={{
                        backgroundColor: "var(--bg-active)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {tool.name.charAt(0)}
                    </div>
                  )}
                  <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                </div>

                {/* ツール名 */}
                <div
                  className="mb-1 text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  {tool.name}
                </div>

                {/* 説明 */}
                <div
                  className="mb-3 text-[10px] leading-relaxed"
                  style={{ color: "var(--text-muted)" }}
                >
                  {tool.description}
                </div>

                {/* フッター: ツール数 + 権限 */}
                <div className="flex items-center justify-between">
                  <span
                    className="font-mono text-[9px]"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {allowedOps} / {tool.operations.length} tools
                  </span>
                  <div className="flex gap-1">
                    {tool.permissions.map((p) => (
                      <span
                        key={p}
                        className="rounded px-1.5 py-0.5 font-mono text-[8px]"
                        style={{
                          backgroundColor: "var(--bg-active)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 最終利用 */}
                <div
                  className="mt-2 text-[9px]"
                  style={{ color: "var(--text-subtle)" }}
                >
                  最終利用: {tool.lastUsed}
                </div>
              </Link>
            );
          })}
        </div>

        {filteredTools.length === 0 && (
          <div
            className="py-12 text-center text-sm"
            style={{ color: "var(--text-subtle)" }}
          >
            条件に一致するツールが見つかりません
          </div>
        )}
      </div>
    </div>
  );
};
