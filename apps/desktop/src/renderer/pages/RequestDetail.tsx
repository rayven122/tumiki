import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { REQUESTS } from "../data/mock";
import type { RequestStatus } from "../data/mock";

/** ステータス表示の設定 */
const statusConfig: Record<
  RequestStatus,
  { style: React.CSSProperties; label: string }
> = {
  pending: {
    style: {
      backgroundColor: "var(--badge-warn-bg)",
      color: "var(--badge-warn-text)",
    },
    label: "\u{1F7E1} 審査中",
  },
  approved: {
    style: {
      backgroundColor: "var(--badge-success-bg)",
      color: "var(--badge-success-text)",
    },
    label: "\u2705 承認済み",
  },
  rejected: {
    style: {
      backgroundColor: "var(--badge-error-bg)",
      color: "var(--badge-error-text)",
    },
    label: "\u{1F534} 却下",
  },
};

/** ステッパーのステップ定義 */
type Step = {
  label: string;
  status: "done" | "current" | "waiting";
};

/** 申請ステータスからステッパーを生成 */
const buildSteps = (request: (typeof REQUESTS)[number]): Step[] => {
  const steps: Step[] = [{ label: "申請", status: "done" }];

  request.approvers.forEach((approver, i) => {
    const label = `${i + 1}次承認`;
    if (approver.status === "approved" || approver.status === "rejected") {
      steps.push({ label, status: "done" });
    } else if (approver.status === "pending") {
      steps.push({ label, status: "current" });
    } else {
      steps.push({ label, status: "waiting" });
    }
  });

  // 完了ステップ
  const allApproved = request.approvers.every((a) => a.status === "approved");
  steps.push({ label: "完了", status: allApproved ? "done" : "waiting" });

  return steps;
};

/** ステップの色 */
const stepColor = (status: Step["status"]): string => {
  if (status === "done") return "bg-emerald-400";
  if (status === "current") return "bg-amber-400";
  return "bg-zinc-600";
};

const stepTextColor = (status: Step["status"]): string => {
  if (status === "done") return "text-emerald-400";
  if (status === "current") return "text-amber-400";
  return "text-zinc-600";
};

// 申請詳細ページ
export const RequestDetail = (): JSX.Element => {
  const { requestId } = useParams<{ requestId: string }>();
  const request = REQUESTS.find((r) => r.id === requestId);

  if (!request) {
    return (
      <div
        className="min-h-screen p-6"
        style={{ backgroundColor: "var(--bg-app)" }}
      >
        <p style={{ color: "var(--text-secondary)" }}>申請が見つかりません</p>
      </div>
    );
  }

  const status = statusConfig[request.status];
  const steps = buildSteps(request);

  return (
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* 戻るリンク */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm hover:opacity-80"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      {/* タイトル + ステータス */}
      <div className="flex items-center gap-3">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          申請詳細
        </h1>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={status.style}
        >
          {status.label}
        </span>
      </div>

      {/* 申請内容 */}
      <div
        className="space-y-4 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          申請内容
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>申請日</p>
            <p style={{ color: "var(--text-secondary)" }}>{request.date}</p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>対象ツール</p>
            <p style={{ color: "var(--text-secondary)" }}>{request.tool}</p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>申請種別</p>
            <p style={{ color: "var(--text-secondary)" }}>{request.type}</p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>希望権限</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {request.requestedPermissions.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>希望操作</p>
            <p style={{ color: "var(--text-secondary)" }}>
              {request.requestedOperations.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p style={{ color: "var(--text-muted)" }}>利用期間</p>
            <p style={{ color: "var(--text-secondary)" }}>{request.period}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p style={{ color: "var(--text-muted)" }}>利用目的</p>
            <p style={{ color: "var(--text-secondary)" }}>{request.purpose}</p>
          </div>
        </div>
      </div>

      {/* 承認状況 ステッパー */}
      <div
        className="space-y-4 rounded-xl p-6"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <h2
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          承認状況
        </h2>
        <div className="flex items-center gap-2">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              {/* ステップ */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`h-3 w-3 rounded-full ${stepColor(step.status)}`}
                />
                <span className={`text-xs ${stepTextColor(step.status)}`}>
                  {step.label}
                </span>
              </div>
              {/* コネクタ */}
              {i < steps.length - 1 && (
                <div className="mb-5 h-px w-12 bg-zinc-700" />
              )}
            </div>
          ))}
        </div>

        {/* 承認者一覧 */}
        <div className="mt-4 space-y-2">
          {request.approvers.map((approver) => (
            <div
              key={approver.name}
              className="flex items-center justify-between text-sm"
            >
              <div>
                <span style={{ color: "var(--text-secondary)" }}>
                  {approver.name}
                </span>
                <span className="ml-2" style={{ color: "var(--text-subtle)" }}>
                  {approver.department}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {approver.date && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {approver.date}
                  </span>
                )}
                <span
                  className={`text-xs ${
                    approver.status === "approved"
                      ? "text-emerald-400"
                      : approver.status === "rejected"
                        ? "text-red-400"
                        : approver.status === "pending"
                          ? "text-amber-400"
                          : "text-zinc-600"
                  }`}
                >
                  {approver.status === "approved"
                    ? "承認済み"
                    : approver.status === "rejected"
                      ? "却下"
                      : approver.status === "pending"
                        ? "審査中"
                        : "待機中"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* コメント（却下理由） */}
      {request.rejectReason && (
        <div className="space-y-2 rounded-xl border border-red-400/20 bg-red-400/[0.03] p-6">
          <h2 className="text-sm font-medium text-red-400">却下理由</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {request.rejectReason}
          </p>
        </div>
      )}

      {/* 取り消しボタン（pending時のみ） */}
      {request.status === "pending" && (
        <button className="rounded-lg border border-red-400/30 px-4 py-2 text-sm text-red-400 hover:border-red-400/50">
          申請を取り消す
        </button>
      )}
    </div>
  );
};
