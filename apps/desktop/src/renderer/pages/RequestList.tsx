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
    <div
      className="min-h-screen space-y-6 p-6"
      style={{ backgroundColor: "var(--bg-app)" }}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1
          className="text-xl font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          権限申請
        </h1>
        <Link
          to="/requests/new"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90"
          style={{
            backgroundColor: "var(--btn-primary-bg)",
            color: "var(--btn-primary-text)",
          }}
        >
          <Plus size={16} />
          新規申請
        </Link>
      </div>

      {/* タブ */}
      <div
        className="flex gap-1 rounded-lg p-1"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded-md px-3 py-1.5 text-sm transition"
            style={
              activeTab === tab.key
                ? {
                    backgroundColor: "var(--bg-active)",
                    color: "var(--text-primary)",
                  }
                : { color: "var(--text-muted)" }
            }
          >
            {tab.label}
            {tab.key !== "all" && (
              <span
                className="ml-1.5 text-xs"
                style={{ color: "var(--text-subtle)" }}
              >
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* テーブル */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-card)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr
              className="text-left text-xs"
              style={{
                borderBottomWidth: 1,
                borderBottomStyle: "solid",
                borderBottomColor: "var(--border)",
                color: "var(--text-muted)",
              }}
            >
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
                  className="last:border-0 hover:opacity-90"
                  style={{
                    borderBottomWidth: 1,
                    borderBottomStyle: "solid",
                    borderBottomColor: "var(--border)",
                  }}
                >
                  <td
                    className="px-5 py-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {req.date}
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {req.tool}
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {req.type}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={status.style}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td
                    className="px-5 py-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {req.approvers.map((a) => a.name).join(", ")}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      to={`/requests/${req.id}`}
                      className="flex items-center gap-1 text-xs hover:opacity-80"
                      style={{ color: "var(--text-muted)" }}
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
