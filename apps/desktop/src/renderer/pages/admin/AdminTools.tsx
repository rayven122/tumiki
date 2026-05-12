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
      className={`rounded-xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg bg-white dark:bg-zinc-900 ${
        tool.approved
          ? "border border-emerald-500/20 dark:border-emerald-400/20"
          : "border border-gray-200 dark:border-white/[.08]"
      }`}
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
        className="mb-1 text-sm font-medium text-gray-900 dark:text-white"
      >
        {tool.name}
      </div>

      {/* 説明 */}
      <div
        className="mb-3 text-[10px] leading-relaxed text-gray-500 dark:text-zinc-500"
      >
        {tool.description}
      </div>

      {/* 操作数 + プロトコル */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="font-mono text-[9px] text-gray-400 dark:text-zinc-600"
        >
          {allowedOps} / {tool.operations.length} ops
        </span>
        <span
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[8px] text-gray-300 dark:bg-white/[.08] dark:text-zinc-700"
        >
          {tool.protocol}
        </span>
      </div>

      {/* アクションボタン */}
      <button
        type="button"
        className={`w-full rounded-lg px-3 py-1.5 text-[10px] font-medium transition hover:opacity-80 ${
          tool.approved
            ? "bg-gray-100 text-gray-600 dark:bg-white/[.08] dark:text-zinc-400"
            : "bg-gray-900 text-white dark:bg-white dark:text-zinc-900"
        }`}
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
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            ツール管理
          </h1>
          <p
            className="mt-1 text-xs text-gray-600 dark:text-zinc-400"
          >
            全{TOOLS.length}件のコネクタ
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-80 dark:bg-white dark:text-zinc-900"
        >
          <Plus size={14} />
          ツール追加
        </button>
      </div>

      {/* ツールカードグリッド */}
      <div
        className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900"
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-b-gray-200 dark:border-b-white/[.08]"
        >
          <div className="flex items-center gap-2">
            <Settings
              className="h-4 w-4 text-gray-500 dark:text-zinc-500"
            />
            <span
              className="text-sm font-medium text-gray-900 dark:text-white"
            >
              コネクタ一覧
            </span>
            <span className="text-xs text-gray-500 dark:text-zinc-500">
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
