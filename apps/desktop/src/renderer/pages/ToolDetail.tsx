import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, Shield } from "lucide-react";
import { TOOLS, HISTORY } from "../data/mock";
import type { ToolStatus } from "../data/mock";

/** ステータスバッジの表示定義 */
const statusBadge: Record<ToolStatus, { className: string; label: string }> = {
  active: {
    className: "bg-emerald-400/10 text-emerald-400",
    label: "稼働中",
  },
  degraded: {
    className: "bg-amber-400/10 text-amber-400",
    label: "応答遅延",
  },
  down: {
    className: "bg-red-400/10 text-red-400",
    label: "停止中",
  },
};

export const ToolDetail = (): JSX.Element => {
  const { toolId } = useParams<{ toolId: string }>();
  const tool = TOOLS.find((t) => t.id === toolId);

  // ツールが見つからない場合
  if (!tool) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <Link
          to="/tools"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
        >
          <ArrowLeft size={14} />
          マイツール
        </Link>
        <div className="mt-12 text-center text-sm text-zinc-600">
          ツールが見つかりません
        </div>
      </div>
    );
  }

  const badge = statusBadge[tool.status];

  // 該当ツールの操作履歴
  const toolHistory = HISTORY.filter((h) => h.tool === tool.name);

  // 権限が不足している操作があるか
  const hasLockedOperations = tool.operations.some((op) => !op.allowed);

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      {/* 戻るリンク */}
      <Link
        to="/tools"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft size={14} />
        マイツール
      </Link>

      {/* ツール名 + ステータス */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/[0.05] text-lg font-semibold text-white">
          {tool.name.charAt(0)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{tool.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-zinc-500">{tool.description}</p>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">基本情報</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-xs text-zinc-600">接続先</span>
            <p className="mt-1 flex items-center gap-1 text-zinc-400">
              <ExternalLink size={12} />
              {tool.endpoint}
            </p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">プロトコル</span>
            <p className="mt-1 text-zinc-400">{tool.protocol}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">追加日</span>
            <p className="mt-1 text-zinc-400">{tool.addedDate}</p>
          </div>
          <div>
            <span className="text-xs text-zinc-600">管理者</span>
            <p className="mt-1 text-zinc-400">{tool.admin}</p>
          </div>
        </div>
      </div>

      {/* あなたの権限 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <div className="mb-4 flex items-center gap-2">
          <Shield size={14} className="text-zinc-500" />
          <h2 className="text-sm font-medium text-white">あなたの権限</h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">
                  操作
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500">
                  説明
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-zinc-500">
                  状態
                </th>
              </tr>
            </thead>
            <tbody>
              {tool.operations.map((op) => (
                <tr
                  key={op.name}
                  className="border-b border-white/[0.04] last:border-0"
                >
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                    {op.name}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">
                    {op.description}
                  </td>
                  <td className="px-4 py-2 text-center text-xs">
                    {op.allowed ? (
                      <span className="text-emerald-400">可</span>
                    ) : (
                      <span className="text-zinc-600">不可</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasLockedOperations && (
          <div className="mt-4">
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
            >
              不可の権限を申請する
            </Link>
          </div>
        )}
      </div>

      {/* 利用統計 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">
          利用統計（今月）
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500">総リクエスト数</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {tool.stats.requests}
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">成功率</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {tool.stats.successRate}%
            </p>
          </div>
          <div>
            <p className="text-xs text-zinc-500">平均応答時間</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {tool.stats.avgLatency}ms
            </p>
          </div>
        </div>
      </div>

      {/* 最近の操作 */}
      <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5">
        <h2 className="mb-4 text-sm font-medium text-white">最近の操作</h2>
        {toolHistory.length > 0 ? (
          <div className="space-y-3">
            {toolHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-600">{item.datetime}</span>
                  <span className="font-mono text-xs text-zinc-400">
                    {item.operation}
                  </span>
                  <span className="text-xs text-zinc-600">{item.detail}</span>
                </div>
                <span
                  className={
                    item.status === "success"
                      ? "text-emerald-400"
                      : item.status === "timeout"
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {item.latency}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-600">操作履歴がありません</p>
        )}
      </div>
    </div>
  );
};
