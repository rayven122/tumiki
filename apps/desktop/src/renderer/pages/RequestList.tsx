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
        <h1
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          権限申請
        </h1>
        <Link
          to="/requests/new"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:opacity-90"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          <Plus size={16} />
          新規申請
        </Link>
      </div>

      {/* ピルナビ */}
      <div
        className="flex items-center gap-1 rounded-lg p-0.5"
        style={{ backgroundColor: "var(--bg-card-hover)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded px-3 py-1.5 text-xs transition-colors"
            style={{
              backgroundColor:
                activeTab === tab.key ? "var(--bg-active)" : "transparent",
              color:
                activeTab === tab.key
                  ? "var(--text-primary)"
                  : "var(--text-subtle)",
            }}
          >
            {tab.label}
            <span className="ml-1 font-mono text-[10px] opacity-60">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
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
                  className="last:border-0"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <td
                    className="px-4 py-2.5"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {req.date}
                  </td>
                  <td
                    className="px-4 py-2.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {req.tool}
                  </td>
                  <td
                    className="px-4 py-2.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
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
                  <td
                    className="px-4 py-2.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {req.approvers.map((a) => a.name).join(", ")}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/requests/${req.id}`}
                      className="flex items-center gap-1 text-[10px] hover:opacity-80"
                      style={{ color: "var(--text-muted)" }}
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
