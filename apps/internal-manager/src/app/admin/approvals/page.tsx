"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import {
  PENDING_APPROVALS,
  type ApprovalUrgency,
} from "../_components/mock-data";

const URGENCY_STYLES: Record<
  ApprovalUrgency,
  { bg: string; text: string; label: string }
> = {
  high: {
    bg: "bg-badge-error-bg",
    text: "text-badge-error-text",
    label: "緊急",
  },
  normal: {
    bg: "bg-badge-info-bg",
    text: "text-badge-info-text",
    label: "通常",
  },
  low: { bg: "bg-bg-active", text: "text-text-muted", label: "低" },
};

const AdminApprovalsPage = () => {
  const [approvals, setApprovals] = useState(PENDING_APPROVALS);
  const [resolved, setResolved] = useState<
    Record<string, "approved" | "rejected">
  >({});
  // タイマーIDを保持し、アンマウント時にクリーンアップする
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setResolved((prev) => ({ ...prev, [id]: action }));
    const t = setTimeout(
      () => setApprovals((prev) => prev.filter((a) => a.id !== id)),
      400,
    );
    timers.current.push(t);
  };

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-text-primary text-lg font-semibold">承認管理</h1>
        <p className="text-text-secondary mt-1 text-xs">
          承認待ち {approvals.length} 件
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-bg-card border-border-default rounded-xl border py-20 text-center">
          <p className="text-text-muted text-sm">承認待ちの申請はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const urgency = URGENCY_STYLES[approval.urgency];
            const isResolving = resolved[approval.id] !== undefined;
            return (
              <div
                key={approval.id}
                className="bg-bg-card border-border-default rounded-xl border p-5 transition-all"
                style={{ opacity: isResolving ? 0.5 : 1 }}
              >
                <div className="flex items-start gap-4">
                  {/* ユーザーアバター */}
                  <div className="bg-bg-active text-text-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                    {approval.user.charAt(0)}
                  </div>

                  {/* 申請内容 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-text-primary font-medium">
                        {approval.user}
                      </span>
                      <span className="text-text-muted text-xs">
                        {approval.department}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${urgency.bg} ${urgency.text}`}
                      >
                        {urgency.label}
                      </span>
                      <span className="text-text-subtle ml-auto text-xs">
                        {approval.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-bold text-white"
                          style={{ backgroundColor: approval.toolColor }}
                        >
                          {approval.tool.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-text-secondary">
                          {approval.tool}
                        </span>
                      </div>
                      <span className="bg-bg-active text-text-muted rounded-full px-2 py-0.5 text-[10px]">
                        {approval.type}
                      </span>
                      <div className="flex gap-1">
                        {approval.permissions.map((p) => (
                          <span
                            key={p}
                            className="bg-badge-info-bg text-badge-info-text rounded px-1.5 py-0.5 font-mono text-[9px]"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-text-secondary text-xs">
                      <span className="text-text-muted">目的: </span>
                      {approval.purpose}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(approval.id, "rejected")}
                      disabled={isResolving}
                      className="bg-badge-error-bg text-badge-error-text flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
                    >
                      <X size={12} />
                      却下
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(approval.id, "approved")}
                      disabled={isResolving}
                      className="bg-badge-success-bg text-badge-success-text flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
                    >
                      <Check size={12} />
                      承認
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminApprovalsPage;
