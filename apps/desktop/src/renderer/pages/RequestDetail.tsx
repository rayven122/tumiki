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
    className: "bg-amber-400/10 text-amber-400",
    label: "\u{1F7E1} 審査中",
  },
  approved: {
    className: "bg-emerald-400/10 text-emerald-400",
    label: "\u2705 承認済み",
  },
  rejected: {
    className: "bg-red-400/10 text-red-400",
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
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <p className="text-zinc-400">申請が見つかりません</p>
      </div>
    );
  }

  const status = statusConfig[request.status];
  const steps = buildSteps(request);

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      {/* 戻るリンク */}
      <Link
        to="/requests"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white"
      >
        <ArrowLeft size={14} />
        権限申請
      </Link>

      {/* タイトル + ステータス */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-white">申請詳細</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* 申請内容 */}
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">申請内容</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-zinc-500">申請日</p>
            <p className="text-zinc-300">{request.date}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">対象ツール</p>
            <p className="text-zinc-300">{request.tool}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">申請種別</p>
            <p className="text-zinc-300">{request.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">希望権限</p>
            <p className="text-zinc-300">
              {request.requestedPermissions.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">希望操作</p>
            <p className="text-zinc-300">
              {request.requestedOperations.join(", ")}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500">利用期間</p>
            <p className="text-zinc-300">{request.period}</p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-zinc-500">利用目的</p>
            <p className="text-zinc-300">{request.purpose}</p>
          </div>
        </div>
      </div>

      {/* 承認状況 ステッパー */}
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#111] p-6">
        <h2 className="text-sm font-medium text-white">承認状況</h2>
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
                <span className="text-zinc-300">{approver.name}</span>
                <span className="ml-2 text-zinc-600">
                  {approver.department}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {approver.date && (
                  <span className="text-xs text-zinc-600">{approver.date}</span>
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
          <p className="text-sm text-zinc-300">{request.rejectReason}</p>
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
