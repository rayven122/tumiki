"use client";

import { useState } from "react";
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
    bg: "var(--badge-error-bg)",
    text: "var(--badge-error-text)",
    label: "緊急",
  },
  normal: {
    bg: "var(--badge-info-bg)",
    text: "var(--badge-info-text)",
    label: "通常",
  },
  low: { bg: "var(--bg-active)", text: "var(--text-muted)", label: "低" },
};

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState(PENDING_APPROVALS);
  const [resolved, setResolved] = useState<
    Record<string, "approved" | "rejected">
  >({});

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setResolved((prev) => ({ ...prev, [id]: action }));
    setTimeout(
      () => setApprovals((prev) => prev.filter((a) => a.id !== id)),
      400,
    );
  };

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div>
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          承認管理
        </h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          承認待ち {approvals.length} 件
        </p>
      </div>

      {approvals.length === 0 ? (
        <div
          className="rounded-xl py-20 text-center"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            承認待ちの申請はありません
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => {
            const urgency = URGENCY_STYLES[approval.urgency];
            const isResolving = resolved[approval.id] !== undefined;
            return (
              <div
                key={approval.id}
                className="rounded-xl p-5 transition-all"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  opacity: isResolving ? 0.5 : 1,
                }}
              >
                <div className="flex items-start gap-4">
                  {/* ユーザーアバター */}
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: "var(--bg-active)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {approval.user.charAt(0)}
                  </div>

                  {/* 申請内容 */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {approval.user}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {approval.department}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor: urgency.bg,
                          color: urgency.text,
                        }}
                      >
                        {urgency.label}
                      </span>
                      <span
                        className="ml-auto text-xs"
                        style={{ color: "var(--text-subtle)" }}
                      >
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
                        <span style={{ color: "var(--text-secondary)" }}>
                          {approval.tool}
                        </span>
                      </div>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: "var(--bg-active)",
                          color: "var(--text-muted)",
                        }}
                      >
                        {approval.type}
                      </span>
                      <div className="flex gap-1">
                        {approval.permissions.map((p) => (
                          <span
                            key={p}
                            className="rounded px-1.5 py-0.5 font-mono text-[9px]"
                            style={{
                              backgroundColor: "var(--badge-info-bg)",
                              color: "var(--badge-info-text)",
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>目的: </span>
                      {approval.purpose}
                    </p>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(approval.id, "rejected")}
                      disabled={isResolving}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "var(--badge-error-bg)",
                        color: "var(--badge-error-text)",
                      }}
                    >
                      <X size={12} />
                      却下
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(approval.id, "approved")}
                      disabled={isResolving}
                      className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: "var(--badge-success-bg)",
                        color: "var(--badge-success-text)",
                      }}
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
}
