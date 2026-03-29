import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { Search, ArrowRight } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, CATEGORIES } from "../data/mock";
import type { ToolStatus } from "../data/mock";

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
  const theme = useAtomValue(themeAtom);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("すべて");
  const [statusFilter, setStatusFilter] = useState<ToolStatus | "all">("all");
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);

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
    <div className="p-6">
      {/* コンテナ（第3階層） */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* ヘッダー */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              コネクト
            </span>
            <span
              className="text-[10px]"
              style={{ color: "var(--text-subtle)" }}
            >
              {filteredTools.length}件表示
            </span>
          </div>
          <Link
            to="/tools/catalog"
            className="flex items-center gap-1 text-xs transition-opacity hover:opacity-80"
            style={{ color: "var(--text-muted)" }}
          >
            カタログを見る
            <ArrowRight size={12} />
          </Link>
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
                  <img
                    src={theme === "dark" ? tool.logoDark : tool.logoLight}
                    alt={tool.name}
                    className="h-8 w-8 rounded-lg"
                  />
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

                {/* AIクライアント別接続パス */}
                <div
                  className="mt-3 space-y-1.5"
                  style={{
                    borderTop: "1px solid var(--border)",
                    paddingTop: 8,
                  }}
                >
                  <span
                    className="text-[9px]"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    接続パス
                  </span>
                  {[
                    {
                      ai: "Cursor",
                      path: `npx tumiki-mcp@latest --connector=${tool.id}`,
                    },
                    {
                      ai: "Claude",
                      path: `https://mcp.tumiki.cloud/${tool.id}/sse`,
                    },
                    {
                      ai: "ChatGPT",
                      path: `https://mcp.tumiki.cloud/${tool.id}/http`,
                    },
                  ].map((p) => (
                    <div
                      key={p.ai}
                      className="flex items-center gap-2 text-[9px]"
                    >
                      <span
                        className="w-12 shrink-0"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {p.ai}
                      </span>
                      <code
                        className="flex-1 truncate rounded px-1.5 py-0.5 font-mono"
                        style={{
                          backgroundColor: "var(--bg-card-hover)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {p.path}
                      </code>
                    </div>
                  ))}
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

      {/* カスタムMCP作成 */}
      <div
        className="mt-4 rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              カスタムコネクタ
            </h2>
            <p
              className="mt-1 text-[10px]"
              style={{ color: "var(--text-muted)" }}
            >
              接続先ツールを選択し、AIへの指示（Description）をカスタマイズできます
            </p>
          </div>
          <button
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
            style={{
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
            }}
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            {showCustomForm ? "閉じる" : "+ 作成"}
          </button>
        </div>

        {showCustomForm && (
          <div
            className="space-y-4"
            style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
          >
            {/* コネクタ名 */}
            <div>
              <label
                className="mb-1 block text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                コネクタ名
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="例: 週次レポート作成"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* ツール選択（チェックボックス） */}
            <div>
              <label
                className="mb-2 block text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                使用するツールを選択
              </label>
              <div className="grid grid-cols-3 gap-2">
                {approvedTools.map((tool) => (
                  <label
                    key={tool.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-xs"
                    style={{
                      backgroundColor: selectedTools.includes(tool.id)
                        ? "var(--bg-active)"
                        : "var(--bg-card-hover)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTools([...selectedTools, tool.id]);
                        } else {
                          setSelectedTools(
                            selectedTools.filter((id) => id !== tool.id),
                          );
                        }
                      }}
                    />
                    <img
                      src={theme === "dark" ? tool.logoDark : tool.logoLight}
                      alt={tool.name}
                      className="h-4 w-4 rounded"
                    />
                    {tool.name}
                  </label>
                ))}
              </div>
            </div>

            {/* カスタムDescription */}
            <div>
              <label
                className="mb-1 block text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                カスタム Description
              </label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={3}
                placeholder="AIに対する指示を記述します。例: 「GitHub の Issue を検索し、Slack の #dev チャンネルに週次サマリーを投稿する」"
                className="w-full resize-none rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-input)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* 接続パス（プレビュー） */}
            {customName && (
              <div
                className="rounded-lg p-3"
                style={{ backgroundColor: "var(--bg-card-hover)" }}
              >
                <span
                  className="mb-2 block text-[10px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  接続パス（プレビュー）
                </span>
                {[
                  {
                    ai: "Cursor",
                    path: `npx tumiki-mcp@latest --connector=${customName.toLowerCase().replace(/\s+/g, "-")}`,
                  },
                  {
                    ai: "Claude",
                    path: `https://mcp.tumiki.cloud/custom/${customName.toLowerCase().replace(/\s+/g, "-")}/sse`,
                  },
                  {
                    ai: "ChatGPT",
                    path: `https://mcp.tumiki.cloud/custom/${customName.toLowerCase().replace(/\s+/g, "-")}/http`,
                  },
                ].map((p) => (
                  <div
                    key={p.ai}
                    className="mt-1 flex items-center gap-2 text-[9px]"
                  >
                    <span
                      className="w-14 shrink-0"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {p.ai}
                    </span>
                    <code
                      className="flex-1 truncate rounded px-1.5 py-0.5 font-mono"
                      style={{
                        backgroundColor: "var(--bg-input)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {p.path}
                    </code>
                  </div>
                ))}
              </div>
            )}

            {/* 保存ボタン */}
            <div className="flex justify-end">
              <button
                className="rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
                style={{
                  backgroundColor: "var(--btn-primary-bg)",
                  color: "var(--btn-primary-text)",
                }}
              >
                作成する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
