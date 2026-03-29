import type { JSX } from "react";
import { useAtomValue } from "jotai";
import { Plus, Settings } from "lucide-react";
import { themeAtom } from "../../store/atoms";
import { TOOLS } from "../../data/mock";
import type { Tool, ToolStatus } from "../../data/mock";

/** ステータスドットのクラス */
const STATUS_DOT: Record<ToolStatus, string> = {
  active: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
};

/** ツールカード */
const ToolCard = ({
  tool,
  theme,
}: {
  tool: Tool;
  theme: "light" | "dark";
}): JSX.Element => {
  const allowedOps = tool.operations.filter((o) => o.allowed).length;
  return (
    <div
      className="rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{
        border: tool.approved
          ? "1px solid rgba(52, 211, 153, 0.2)"
          : "1px solid var(--border)",
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
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[tool.status]}`} />
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

      {/* 操作数 + プロトコル */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono text-[9px]"
          style={{ color: "var(--text-subtle)" }}
        >
          {allowedOps} / {tool.operations.length} ops
        </span>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[8px]"
          style={{
            backgroundColor: "var(--bg-active)",
            color: "var(--text-muted)",
          }}
        >
          {tool.protocol}
        </span>
      </div>

      {/* アクションボタン */}
      <button
        type="button"
        className="w-full rounded-lg px-3 py-1.5 text-[10px] font-medium transition hover:opacity-80"
        style={
          tool.approved
            ? {
                backgroundColor: "var(--bg-active)",
                color: "var(--text-secondary)",
              }
            : {
                backgroundColor: "var(--text-primary)",
                color: "var(--bg-card)",
              }
        }
      >
        {tool.approved ? (
          <span className="flex items-center justify-center gap-1">
            <Settings size={10} />
            設定
          </span>
        ) : (
          "有効化"
        )}
      </button>
    </div>
  );
};

export const AdminTools = (): JSX.Element => {
  const theme = useAtomValue(themeAtom);

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            ツール管理
          </h1>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--text-secondary)" }}
          >
            全{TOOLS.length}件のコネクタ
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
          style={{
            backgroundColor: "var(--text-primary)",
            color: "var(--bg-card)",
          }}
        >
          <Plus size={14} />
          ツール追加
        </button>
      </div>

      {/* ツールカードグリッド */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <Settings
              className="h-4 w-4"
              style={{ color: "var(--text-muted)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              コネクタ一覧
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {TOOLS.length}件
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.id} tool={tool} theme={theme} />
          ))}
        </div>
      </div>
    </div>
  );
};
