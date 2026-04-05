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
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">
          権限申請
        </h1>
        <Link
          to="/requests/new"
          className="flex items-center gap-1.5 rounded-lg bg-[var(--btn-primary-bg)] px-4 py-2 text-sm font-medium text-[var(--btn-primary-text)] transition-colors hover:opacity-90"
        >
          <Plus size={16} />
          新規申請
        </Link>
      </div>

      {/* ピルナビ */}
      <div className="flex items-center gap-1 rounded-lg bg-[var(--bg-card-hover)] p-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded px-3 py-1.5 text-xs transition-colors ${
              activeTab === tab.key
                ? "bg-[var(--bg-active)] text-[var(--text-primary)]"
                : "text-[var(--text-subtle)]"
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
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-b-[var(--border)] text-[var(--text-muted)]">
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
                  className="border-b border-b-[var(--border)] last:border-0"
                >
                  <td className="px-4 py-2.5 text-[var(--text-subtle)]">
                    {req.date}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-primary)]">
                    {req.tool}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {req.type}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: status.bg, color: status.text }}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">
                    {req.approvers.map((a) => a.name).join(", ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/requests/${req.id}`}
                      className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:opacity-80"
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
