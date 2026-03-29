import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { REQUESTS } from "../data/mock";
import type { RequestStatus } from "../data/mock";

/** タブの定義 */
type TabKey = "all" | RequestStatus;

type TabDef = {
  key: TabKey;
  label: string;
  count: number;
};

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

// 権限申請一覧ページ
export const RequestList = (): JSX.Element => {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const tabs: TabDef[] = [
    { key: "all", label: "すべて", count: REQUESTS.length },
    {
      key: "pending",
      label: "審査中",
      count: REQUESTS.filter((r) => r.status === "pending").length,
    },
    {
      key: "approved",
      label: "承認済み",
      count: REQUESTS.filter((r) => r.status === "approved").length,
    },
    {
      key: "rejected",
      label: "却下",
      count: REQUESTS.filter((r) => r.status === "rejected").length,
    },
  ];

  const filtered =
    activeTab === "all"
      ? REQUESTS
      : REQUESTS.filter((r) => r.status === activeTab);

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0a] p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">権限申請</h1>
        <Link
          to="/requests/new"
          className="flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
        >
          <Plus size={16} />
          新規申請
        </Link>
      </div>

      {/* タブ */}
      <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-[#111] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              activeTab === tab.key
                ? "bg-white/[0.08] text-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-xs text-zinc-600">
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#111]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left text-xs text-zinc-500">
              <th className="px-5 py-3 font-medium">申請日</th>
              <th className="px-5 py-3 font-medium">ツール</th>
              <th className="px-5 py-3 font-medium">申請内容</th>
              <th className="px-5 py-3 font-medium">ステータス</th>
              <th className="px-5 py-3 font-medium">承認者</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => {
              const status = statusConfig[req.status];
              return (
                <tr
                  key={req.id}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4 text-zinc-400">{req.date}</td>
                  <td className="px-5 py-4 text-white">{req.tool}</td>
                  <td className="px-5 py-4 text-zinc-400">{req.type}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-400">
                    {req.approvers.map((a) => a.name).join(", ")}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/requests/${req.id}`}
                      className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
                    >
                      詳細
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
