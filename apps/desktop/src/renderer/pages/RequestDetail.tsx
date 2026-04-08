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
    label: "審査中",
  },
  approved: {
    style: {
      backgroundColor: "var(--badge-success-bg)",
      color: "var(--badge-success-text)",
    },
    label: "承認済み",
  },
  rejected: {
    style: {
      backgroundColor: "var(--badge-error-bg)",
      color: "var(--badge-error-text)",
    },
    label: "却下",
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

/** ステップのドット色（CSS変数ベース） */
const stepDotStyle = (status: Step["status"]): React.CSSProperties => {
  if (status === "done")
    return { backgroundColor: "var(--badge-success-text)" };
  if (status === "current")
    return { backgroundColor: "var(--badge-warn-text)" };
  return { backgroundColor: "var(--text-subtle)" };
};

/** ステップのラベル色 */
const stepLabelStyle = (status: Step["status"]): React.CSSProperties => {
  if (status === "done") return { color: "var(--badge-success-text)" };
  if (status === "current") return { color: "var(--badge-warn-text)" };
  return { color: "var(--text-subtle)" };
};

/** コネクタの色 */
const connectorStyle = (
  current: Step["status"],
  next: Step["status"],
): React.CSSProperties => {
  if (current === "done" && (next === "done" || next === "current"))
    return { backgroundColor: "var(--badge-success-text)", opacity: 0.4 };
  return { backgroundColor: "var(--text-subtle)", opacity: 0.3 };
};

/** 承認者ステータスの色 */
const approverStatusStyle = (
  status: string,
): { style: React.CSSProperties; label: string } => {
  switch (status) {
    case "approved":
      return {
        style: { color: "var(--badge-success-text)" },
        label: "承認済み",
      };
    case "rejected":
      return {
        style: { color: "var(--badge-error-text)" },
        label: "却下",
      };
    case "pending":
      return {
        style: { color: "var(--badge-warn-text)" },
        label: "審査中",
      };
    default:
      return { style: { color: "var(--text-subtle)" }, label: "待機中" };
  }
};

// 申請詳細ページ
export const RequestDetail = (): JSX.Element => {
  const { requestId } = useParams<{ requestId: string }>();
  const request = REQUESTS.find((r) => r.id === requestId);

  if (!request) {
    return (
      <div className="p-6">
        <p className="text-[var(--text-secondary)]">申請が見つかりません</p>
      </div>
    );
  }

  const status = statusConfig[request.status];
  const steps = buildSteps(request);

  return (
    <div className="space-y-4 p-6">
      {/* 戻るリンク */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:opacity-80"
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      {/* タイトル + ステータス */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          申請詳細
        </h1>
        <span
          className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
          style={status.style}
        >
          {status.label}
        </span>
      </div>

      {/* 申請内容 */}
      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          申請内容
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">申請日</p>
            <p className="text-[var(--text-secondary)]">{request.date}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">対象ツール</p>
            <p className="text-[var(--text-secondary)]">{request.tool}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">申請種別</p>
            <p className="text-[var(--text-secondary)]">{request.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">希望権限</p>
            <p className="text-[var(--text-secondary)]">
              {request.requestedPermissions.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">希望操作</p>
            <p className="text-[var(--text-secondary)]">
              {request.requestedOperations.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-muted)]">利用期間</p>
            <p className="text-[var(--text-secondary)]">{request.period}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-xs text-[var(--text-muted)]">利用目的</p>
            <p className="text-[var(--text-secondary)]">{request.purpose}</p>
          </div>
        </div>
      </div>

      {/* 承認状況 ステッパー */}
      <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">
          承認状況
        </h2>

        {/* ビジュアルステッパー */}
        <div className="flex items-start">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-start">
              <div className="flex flex-col items-center gap-1.5">
                {/* ドット */}
                <div
                  className="flex h-5 w-5 items-center justify-center rounded-full"
                  style={{
                    ...stepDotStyle(step.status),
                    opacity: step.status === "waiting" ? 0.4 : 1,
                  }}
                >
                  {step.status === "done" && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2.5 5L4.5 7L7.5 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {step.status === "current" && (
                    <div className="h-2 w-2 rounded-full bg-white" />
                  )}
                </div>
                {/* ラベル */}
                <span
                  className="text-[10px] whitespace-nowrap"
                  style={stepLabelStyle(step.status)}
                >
                  {step.label}
                </span>
              </div>
              {/* コネクタライン */}
              {i < steps.length - 1 && (
                <div
                  className="mt-2.5 h-px w-10 shrink-0"
                  style={connectorStyle(
                    step.status,
                    steps[i + 1]?.status ?? "waiting",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* 承認者一覧 */}
        <div className="mt-2 space-y-2 border-t border-t-[var(--border)] pt-4">
          {request.approvers.map((approver) => {
            const approverStatus = approverStatusStyle(approver.status);
            return (
              <div
                key={approver.name}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-[var(--text-secondary)]">
                    {approver.name}
                  </span>
                  <span className="ml-2 text-xs text-[var(--text-subtle)]">
                    {approver.department}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {approver.date && (
                    <span className="text-xs text-[var(--text-subtle)]">
                      {approver.date}
                    </span>
                  )}
                  <span className="text-xs" style={approverStatus.style}>
                    {approverStatus.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 却下理由 */}
      {request.rejectReason && (
        <div className="space-y-2 rounded-xl border border-[var(--badge-error-bg)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-medium text-[var(--badge-error-text)]">
            却下理由
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {request.rejectReason}
          </p>
        </div>
      )}

      {/* 取り消しボタン（pending時のみ） */}
      {request.status === "pending" && (
        <button className="rounded-lg border border-[var(--badge-error-bg)] px-4 py-2 text-sm text-[var(--badge-error-text)] transition-colors hover:opacity-80">
          申請を取り消す
        </button>
      )}
    </div>
  );
};
