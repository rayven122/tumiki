import type { JSX } from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";
import { REQUESTS } from "../data/mock";
import type { RequestStatus } from "../data/mock";
import { statusBadge } from "../utils/theme-styles";

/** タブの定義 */
type TabKey = "all" | RequestStatus;

type TabDef = {
  key: TabKey;
  label: string;
  count: number;
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
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          権限申請
        </h1>
        <Link
          to="/requests/new"
          className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 dark:bg-white dark:text-black"
        >
          <Plus size={16} />
          新規申請
        </Link>
      </div>

      {/* ピルナビ */}
      <div className="flex items-center gap-1 rounded-lg bg-black/[.02] p-0.5 dark:bg-white/[.04]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded px-3 py-1.5 text-xs transition-colors ${
              activeTab === tab.key
                ? "bg-black/[.06] text-gray-900 dark:bg-white/[.08] dark:text-white"
                : "text-gray-400 dark:text-zinc-600"
            }`}
          >
            {tab.label}
            <span className="ml-1 font-mono text-[10px] opacity-60">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-b-gray-200 text-gray-500 dark:border-b-white/[.08] dark:text-zinc-500">
              <th className="px-4 py-2.5 text-left font-medium">申請日</th>
              <th className="px-4 py-2.5 text-left font-medium">ツール</th>
              <th className="px-4 py-2.5 text-left font-medium">申請内容</th>
              <th className="px-4 py-2.5 text-left font-medium">ステータス</th>
              <th className="px-4 py-2.5 text-left font-medium">承認者</th>
              <th className="px-4 py-2.5 text-left font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((req) => {
              const status = statusBadge(req.status);
              return (
                <tr
                  key={req.id}
                  className="border-b border-b-gray-200 last:border-0 dark:border-b-white/[.08]"
                >
                  <td className="px-4 py-2.5 text-gray-400 dark:text-zinc-600">
                    {req.date}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900 dark:text-white">
                    {req.tool}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">
                    {req.type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">
                    {req.approvers.map((a) => a.name).join(", ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/requests/${req.id}`}
                      className="flex items-center gap-1 text-[10px] text-gray-500 hover:opacity-80 dark:text-zinc-500"
                    >
                      詳細
                      <ChevronRight size={12} />
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
