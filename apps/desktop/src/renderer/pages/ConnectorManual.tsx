import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAtomValue } from "jotai";
import { ArrowLeft, Check, Play } from "lucide-react";
import { themeAtom } from "../store/atoms";
import { TOOLS, MCP_BASE_URL, MCP_CLI_COMMAND } from "../data/mock";

export const ConnectorManual = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);
  const approvedTools = TOOLS.filter((t) => t.approved);
  const [connectorName, setConnectorName] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedOps, setSelectedOps] = useState<Record<string, string[]>>({});
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);

  /** ツール選択のトグル */
  const toggleTool = (id: string) => {
    if (selectedTools.includes(id)) {
      setSelectedTools((prev) => prev.filter((x) => x !== id));
      setSelectedOps((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setSelectedTools((prev) => [...prev, id]);
      // 全オペレーションをデフォルト選択
      const tool = TOOLS.find((t) => t.id === id);
      if (tool) {
        setSelectedOps((prev) => ({
          ...prev,
          [id]: tool.operations.filter((o) => o.allowed).map((o) => o.name),
        }));
      }
    }
  };

  /** オペレーション選択のトグル */
  const toggleOp = (toolId: string, opName: string) => {
    setSelectedOps((prev) => {
      const current = prev[toolId] ?? [];
      const next = current.includes(opName)
        ? current.filter((x) => x !== opName)
        : [...current, opName];
      return { ...prev, [toolId]: next };
    });
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
        className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:opacity-80"
      >
        <ArrowLeft size={14} /> コネクト
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          マニュアル作成
        </h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          ツールを選択し、Descriptionを編集してカスタムコネクタを作成します
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)]">
        {/* コネクタ名 */}
        <div className="mb-5">
          <label className="mb-1 block text-xs text-[var(--text-muted)]">
            コネクタ名
          </label>
          <input
            type="text"
            value={connectorName}
            onChange={(e) => setConnectorName(e.target.value)}
            placeholder="例: 週次レポート自動作成"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
          />
        </div>

        {/* ツール選択 */}
        <div className="mb-5 border-t border-t-[var(--border)] pt-4">
          <label className="mb-2 block text-xs text-[var(--text-muted)]">
            使用するツールを選択
          </label>
          <div className="grid grid-cols-3 gap-2">
            {approvedTools.map((tool) => {
              const isSelected = selectedTools.includes(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs text-[var(--text-secondary)] transition-colors ${
                    isSelected
                      ? "border-emerald-400/30 bg-[var(--bg-active)]"
                      : "border-transparent bg-[var(--bg-card-hover)]"
                  }`}
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

        {/* 選択したツールのオペレーション選択 + Description編集 */}
        {selectedTools.length > 0 && (
          <div className="mb-5 border-t border-t-[var(--border)] pt-4">
            <label className="mb-3 block text-xs text-[var(--text-muted)]">
              ツール設定（オペレーション選択 + Description上書き）
            </label>
            <div className="space-y-3">
              {selectedTools.map((id) => {
                const tool = TOOLS.find((t) => t.id === id);
                if (!tool) return null;
                const ops = selectedOps[id] ?? [];
                return (
                  <div
                    key={id}
                    className="rounded-lg bg-[var(--bg-card-hover)] p-3"
                  >
                    {/* ツール名 */}
                    <div className="mb-3 flex items-center gap-2">
                      <img
                        src={theme === "dark" ? tool.logoDark : tool.logoLight}
                        alt={tool.name}
                        className="h-4 w-4 rounded"
                      />
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        {tool.name}
                      </span>
                      <span className="text-[9px] text-[var(--text-subtle)]">
                        {ops.length} / {tool.operations.length} ツール選択中
                      </span>
                    </div>

                    {/* オペレーション選択 */}
                    <div className="mb-3">
                      <span className="mb-1.5 block text-[9px] text-[var(--text-subtle)]">
                        使用するツール（オペレーション）
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {tool.operations.map((op) => {
                          const isSelected = ops.includes(op.name);
                          return (
                            <button
                              key={op.name}
                              onClick={() => toggleOp(id, op.name)}
                              className={`rounded border px-2 py-1 font-mono text-[9px] transition-colors ${
                                isSelected
                                  ? "border-emerald-400/30 bg-[var(--bg-active)] text-[var(--text-primary)]"
                                  : "border-transparent bg-[var(--bg-input)] text-[var(--text-subtle)]"
                              }`}
                              title={op.description}
                            >
                              {op.name}
                            </button>
                          );
                        })}
                      </div>
                      {/* 選択中オペレーションの説明 */}
                      {ops.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {ops.map((opName) => {
                            const op = tool.operations.find(
                              (o) => o.name === opName,
                            );
                            return op ? (
                              <div
                                key={opName}
                                className="flex items-center gap-2 text-[9px]"
                              >
                                <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                                <span className="font-mono text-[var(--text-muted)]">
                                  {op.name}
                                </span>
                                <span className="text-[var(--text-subtle)]">
                                  — {op.description}
                                </span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    {/* 元のDescription */}
                    <div className="mb-2 rounded-md bg-[var(--bg-input)] px-2.5 py-1.5">
                      <span className="text-[9px] text-[var(--text-subtle)]">
                        元のDescription
                      </span>
                      <p className="font-mono text-[10px] text-[var(--text-subtle)] line-through">
                        {tool.description}
                      </p>
                    </div>

                    {/* カスタムDescription */}
                    <div className="rounded-md border border-emerald-400/15 bg-emerald-400/[0.02] px-2.5 py-1.5">
                      <span className="text-[9px] text-[var(--badge-success-text)]">
                        ✎ カスタムDescription
                      </span>
                      <textarea
                        value={descriptions[id] ?? ""}
                        onChange={(e) => updateDescription(id, e.target.value)}
                        rows={2}
                        placeholder="AIに対する指示を記述..."
                        className="mt-1 w-full resize-none bg-transparent text-[10px] leading-relaxed text-[var(--text-secondary)] outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ボタン群 */}
        <div className="border-t border-t-[var(--border)] pt-4">
          {!saved ? (
            <div className="flex items-center justify-end gap-3">
              <Link
                to="/tools"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] transition-colors hover:opacity-80"
              >
                キャンセル
              </Link>
              <button
                onClick={() => setTesting(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] transition-colors hover:opacity-80"
              >
                <Play size={14} /> 検証する
              </button>
              <button
                onClick={() => setSaved(true)}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-xs font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90"
              >
                <Check size={14} /> 保存する
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-2">
                <Check size={14} className="text-[var(--badge-success-text)]" />
                <span className="text-xs text-[var(--badge-success-text)]">
                  コネクタを保存しました
                </span>
              </div>

              {/* 接続パス（保存後に表示） */}
              <div>
                <span className="text-[10px] text-[var(--text-subtle)]">
                  接続パス
                </span>
                {[
                  {
                    ai: "Cursor",
                    path: `${MCP_CLI_COMMAND} --connector=${slug}`,
                  },
                  {
                    ai: "Claude",
                    path: `${MCP_BASE_URL}/custom/${slug}/sse`,
                  },
                  {
                    ai: "ChatGPT",
                    path: `${MCP_BASE_URL}/custom/${slug}/http`,
                  },
                ].map((p) => (
                  <div
                    key={p.ai}
                    className="mt-1 flex items-center gap-2 text-[9px]"
                  >
                    <span className="w-14 shrink-0 text-[var(--text-muted)]">
                      {p.ai}
                    </span>
                    <code className="flex-1 truncate rounded bg-[var(--bg-input)] px-1.5 py-0.5 font-mono text-[var(--text-secondary)]">
                      {p.path}
                    </code>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setTesting(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-muted)] transition-colors hover:opacity-80"
              >
                <Play size={14} /> 検証する
              </button>
            </div>
          )}

          {/* 検証パネル */}
          {testing && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-input)] p-3">
              <div className="mb-2 flex items-center gap-2">
                <Play size={12} className="text-[var(--badge-warn-text)]" />
                <span className="text-[10px] font-medium text-[var(--text-primary)]">
                  検証結果
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[9px]">
                {selectedTools.map((id) => {
                  const tool = TOOLS.find((t) => t.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[var(--text-secondary)]">
                        {tool?.name ?? id} → 200 OK
                      </span>
                    </div>
                  );
                })}
              </div>
              {selectedTools.length > 0 && (
                <div className="mt-2 text-[9px] text-[var(--badge-success-text)]">
                  全ツールの接続を確認しました
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
