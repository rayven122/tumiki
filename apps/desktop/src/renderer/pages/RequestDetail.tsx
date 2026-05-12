import type { JSX } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { REQUESTS } from "../data/mock";
import type { RequestStatus } from "../data/mock";

/** ステータス表示の設定 */
const statusConfig: Record<
  RequestStatus,
  { className: string; label: string }
> = {
  pending: {
    className:
      "bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400",
    label: "審査中",
  },
  approved: {
    className:
      "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400",
    label: "承認済み",
  },
  rejected: {
    className:
      "bg-red-500/10 text-red-600 dark:bg-red-400/10 dark:text-red-400",
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

/** ステップのドット色 */
const stepDotClass = (status: Step["status"]): string => {
  if (status === "done") return "bg-emerald-600 dark:bg-emerald-400";
  if (status === "current") return "bg-amber-600 dark:bg-amber-400";
  return "bg-gray-300 dark:bg-zinc-600";
};

/** ステップのラベル色 */
const stepLabelClass = (status: Step["status"]): string => {
  if (status === "done") return "text-emerald-600 dark:text-emerald-400";
  if (status === "current") return "text-amber-600 dark:text-amber-400";
  return "text-gray-400 dark:text-zinc-600";
};

/** コネクタの色 */
const connectorClass = (
  current: Step["status"],
  next: Step["status"],
): string => {
  if (current === "done" && (next === "done" || next === "current"))
    return "bg-emerald-600/40 dark:bg-emerald-400/40";
  return "bg-gray-300/30 dark:bg-zinc-600/30";
};

/** 承認者ステータスの色 */
const approverStatusInfo = (
  status: string,
): { className: string; label: string } => {
  switch (status) {
    case "approved":
      return {
        className: "text-emerald-600 dark:text-emerald-400",
        label: "承認済み",
      };
    case "rejected":
      return { className: "text-red-600 dark:text-red-400", label: "却下" };
    case "pending":
      return {
        className: "text-amber-600 dark:text-amber-400",
        label: "審査中",
      };
    default:
      return { className: "text-gray-400 dark:text-zinc-600", label: "待機中" };
  }
};

// 申請詳細ページ
export const RequestDetail = (): JSX.Element => {
  const { requestId } = useParams<{ requestId: string }>();
  const request = REQUESTS.find((r) => r.id === requestId);

  if (!request) {
    return (
      <div className="p-6">
        <p className="text-gray-600 dark:text-zinc-400">申請が見つかりません</p>
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
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:opacity-80 dark:text-zinc-500"
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      {/* タイトル + ステータス */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          申請詳細
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* 申請内容 */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[.08] dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          申請内容
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">申請日</p>
            <p className="text-gray-600 dark:text-zinc-400">{request.date}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">
              対象ツール
            </p>
            <p className="text-gray-600 dark:text-zinc-400">{request.tool}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">申請種別</p>
            <p className="text-gray-600 dark:text-zinc-400">{request.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">希望権限</p>
            <p className="text-gray-600 dark:text-zinc-400">
              {request.requestedPermissions.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">希望操作</p>
            <p className="text-gray-600 dark:text-zinc-400">
              {request.requestedOperations.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">利用期間</p>
            <p className="text-gray-600 dark:text-zinc-400">{request.period}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-xs text-gray-500 dark:text-zinc-500">利用目的</p>
            <p className="text-gray-600 dark:text-zinc-400">
              {request.purpose}
            </p>
          </div>
        </div>
      </div>

      {/* 承認状況 ステッパー */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-white/[.08] dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
          承認状況
        </h2>

        {/* ビジュアルステッパー */}
        <div className="flex items-start">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-start">
              <div className="flex flex-col items-center gap-1.5">
                {/* ドット */}
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${stepDotClass(step.status)} ${step.status === "waiting" ? "opacity-40" : ""}`}
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
                  className={`text-[10px] whitespace-nowrap ${stepLabelClass(step.status)}`}
                >
                  {step.label}
                </span>
              </div>
              {/* コネクタライン */}
              {i < steps.length - 1 && (
                <div
                  className={`mt-2.5 h-px w-10 shrink-0 ${connectorClass(step.status, steps[i + 1]?.status ?? "waiting")}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 承認者一覧 */}
        <div className="mt-2 space-y-2 border-t border-t-gray-200 pt-4 dark:border-t-white/[.08]">
          {request.approvers.map((approver) => {
            const approverStatus = approverStatusInfo(approver.status);
            return (
              <div
                key={approver.name}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-gray-600 dark:text-zinc-400">
                    {approver.name}
                  </span>
                  <span className="ml-2 text-xs text-gray-400 dark:text-zinc-600">
                    {approver.department}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {approver.date && (
                    <span className="text-xs text-gray-400 dark:text-zinc-600">
                      {approver.date}
                    </span>
                  )}
                  <span className={`text-xs ${approverStatus.className}`}>
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
        <div className="space-y-2 rounded-xl border border-red-500/10 bg-white p-6 dark:border-red-400/10 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-red-600 dark:text-red-400">
            却下理由
          </h2>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            {request.rejectReason}
          </p>
        </div>
      )}

      {/* 取り消しボタン（pending時のみ） */}
      {request.status === "pending" && (
        <button className="rounded-lg border border-red-500/10 px-4 py-2 text-sm text-red-600 transition-colors hover:opacity-80 dark:border-red-400/10 dark:text-red-400">
          申請を取り消す
        </button>
      )}
    </div>
  );
};
