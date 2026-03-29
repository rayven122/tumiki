import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ArrowLeft } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS } from "../data/mock";

export const ConnectorManual = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const approvedTools = TOOLS.filter((t) => t.approved);
  const [connectorName, setConnectorName] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  /** ツール選択のトグル */
  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /** Description更新 */
  const updateDescription = (toolId: string, value: string) => {
    setDescriptions((prev) => ({ ...prev, [toolId]: value }));
  };

  const slug = connectorName.toLowerCase().replace(/\s+/g, "-").slice(0, 30);

  return (
    <div className="space-y-6 p-6">
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} /> コネクト
      </Link>

      <div>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          マニュアル作成
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          ツールを選択し、Descriptionを編集してカスタムコネクタを作成します
        </p>
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* コネクタ名 */}
        <div className="mb-5">
          <label
            className="mb-1 block text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            コネクタ名
          </label>
          <input
            type="text"
            value={connectorName}
            onChange={(e) => setConnectorName(e.target.value)}
            placeholder="例: 週次レポート自動作成"
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--bg-input)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* ツール選択 */}
        <div
          className="mb-5"
          style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
        >
          <label
            className="mb-2 block text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            使用するツールを選択
          </label>
          <div className="grid grid-cols-3 gap-2">
            {approvedTools.map((tool) => {
              const isSelected = selectedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--bg-active)"
                      : "var(--bg-card-hover)",
                    color: "var(--text-secondary)",
                    border: isSelected
                      ? "1px solid rgba(52,211,153,0.3)"
                      : "1px solid transparent",
                  }}
                >
                  <img
                    src={theme === "dark" ? tool.logoDark : tool.logoLight}
                    alt={tool.name}
                    className="h-4 w-4 rounded"
                  />
                  {tool.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 選択したツールのDescription編集 */}
        {selectedTools.length > 0 && (
          <div
            className="mb-5"
            style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
          >
            <label
              className="mb-3 block text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              Description 上書き（ツールごと）
            </label>
            <div className="space-y-3">
              {selectedTools.map((id) => {
                const tool = TOOLS.find((t) => t.id === id);
                if (!tool) return null;
                return (
                  <div
                    key={id}
                    className="rounded-lg p-3"
                    style={{ backgroundColor: "var(--bg-card-hover)" }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <img
                        src={theme === "dark" ? tool.logoDark : tool.logoLight}
                        alt={tool.name}
                        className="h-4 w-4 rounded"
                      />
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {tool.name}
                      </span>
                    </div>
                    {/* 元のDescription */}
                    <div
                      className="mb-2 rounded-md px-2.5 py-1.5"
                      style={{ backgroundColor: "var(--bg-input)" }}
                    >
                      <span
                        className="text-[9px]"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        元のDescription
                      </span>
                      <p
                        className="font-mono text-[10px] line-through"
                        style={{ color: "var(--text-subtle)" }}
                      >
                        {tool.description}
                      </p>
                    </div>
                    {/* カスタムDescription */}
                    <div
                      className="rounded-md px-2.5 py-1.5"
                      style={{
                        border: "1px solid rgba(52,211,153,0.15)",
                        backgroundColor: "rgba(52,211,153,0.02)",
                      }}
                    >
                      <span
                        className="text-[9px]"
                        style={{ color: "var(--badge-success-text)" }}
                      >
                        ✎ カスタムDescription
                      </span>
                      <textarea
                        value={descriptions[id] ?? ""}
                        onChange={(e) => updateDescription(id, e.target.value)}
                        rows={2}
                        placeholder="AIに対する指示を記述..."
                        className="mt-1 w-full resize-none bg-transparent text-[10px] leading-relaxed outline-none"
                        style={{ color: "var(--text-secondary)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 接続パスプレビュー */}
        {connectorName && (
          <div
            className="mb-5 rounded-lg p-3"
            style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}
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
                path: `npx tumiki-mcp@latest --connector=${slug}`,
              },
              {
                ai: "Claude",
                path: `https://mcp.tumiki.cloud/custom/${slug}/sse`,
              },
              {
                ai: "ChatGPT",
                path: `https://mcp.tumiki.cloud/custom/${slug}/http`,
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

        {/* 作成ボタン */}
        <div className="flex justify-end gap-3">
          <Link
            to="/tools"
            className="rounded-lg px-4 py-2 text-xs transition-colors hover:opacity-80"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
            }}
          >
            キャンセル
          </Link>
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
    </div>
  );
};
