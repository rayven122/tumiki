import type { JSX } from "react";
import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { PENDING_APPROVALS } from "../../data/admin-mock";
import type { PendingApproval } from "../../data/admin-mock";

/* ---------- 緊急度バッジ設定 ---------- */

const URGENCY_CONFIG: Record<
  PendingApproval["urgency"],
  { className: string; label: string }
> = {
  high: { className: "bg-red-500/15 text-red-400", label: "高" },
  normal: { className: "bg-amber-500/15 text-amber-400", label: "中" },
  low: { className: "bg-zinc-500/15 text-zinc-400", label: "低" },
};

/* ---------- メインコンポーネント ---------- */

export const AdminApprovals = (): JSX.Element => {
  const [visibleIds, setVisibleIds] = useState<string[]>(
    PENDING_APPROVALS.map((a) => a.id),
  );

  const visible = PENDING_APPROVALS.filter((a) => visibleIds.includes(a.id));

  /** 承認・却下でカードを非表示にする */
  const dismiss = (id: string) => {
    setVisibleIds((prev) => prev.filter((v) => v !== id));
  };

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          承認管理
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-300 dark:bg-white/[.08] dark:text-zinc-700">
          {visible.length} 件待ち
        </span>
      </div>

      {/* 承認待ちカード一覧 */}
      {visible.length === 0 ? (
        <div className="py-16 text-center text-xs text-gray-500 dark:text-zinc-500">
          承認待ちの申請はありません
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((approval) => {
            const urgency = URGENCY_CONFIG[approval.urgency];
            return (
              <div
                key={approval.id}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[.08] dark:bg-zinc-900"
              >
                {/* 上段: ユーザー情報 + 緊急度 */}
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {approval.user}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-500">
                        {approval.department}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[10px] text-gray-400 dark:text-zinc-600">
                      申請日: {approval.date}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${urgency.className}`}
                  >
                    {urgency.label}
                  </span>
                </div>

                {/* 中段: ツール + 申請種別 + 権限 */}
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-gray-900 dark:text-white">
                    {approval.tool}
                  </span>
                  <span className="text-[10px] text-gray-600 dark:text-zinc-400">
                    {approval.type}
                  </span>
                  {approval.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-400"
                    >
                      {perm}
                    </span>
                  ))}
                </div>

                {/* 利用目的 */}
                <p className="mb-3 text-xs leading-relaxed text-gray-600 dark:text-zinc-400">
                  {approval.purpose}
                </p>

                {/* ボタン */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dismiss(approval.id)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    承認
                  </button>
                  <button
                    onClick={() => dismiss(approval.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    却下
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
