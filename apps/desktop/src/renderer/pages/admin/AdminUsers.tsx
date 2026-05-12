import type { JSX } from "react";
import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { ORG_USERS } from "../../data/admin-mock";
import type { UserRole, UserStatus } from "../../data/admin-mock";

/* ---------- ロール別カラー ---------- */

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  Admin: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  Manager: { bg: "bg-blue-500/15", text: "text-blue-400" },
  Developer: { bg: "bg-purple-500/15", text: "text-purple-400" },
  Member: { bg: "bg-amber-500/15", text: "text-amber-400" },
};

/* ---------- ステータス別カラー ---------- */

const STATUS_CONFIG: Record<UserStatus, { dot: string; label: string }> = {
  active: { dot: "bg-emerald-400", label: "Active" },
  inactive: { dot: "bg-zinc-500", label: "Inactive" },
  suspended: { dot: "bg-red-400", label: "Suspended" },
};

/* ---------- フィルタ選択肢 ---------- */

const ROLE_OPTIONS: readonly UserRole[] = [
  "Admin",
  "Manager",
  "Developer",
  "Member",
] as const;

const STATUS_OPTIONS: readonly UserStatus[] = [
  "active",
  "inactive",
  "suspended",
] as const;

/* ---------- イニシャル生成 ---------- */

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

/* ---------- メインコンポーネント ---------- */

export const AdminUsers = (): JSX.Element => {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");

  /* フィルタ適用 */
  const filtered = ORG_USERS.filter((u) => {
    if (query && !u.name.includes(query) && !u.email.includes(query))
      return false;
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            ユーザー管理
          </h2>
          <span
            className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-300 dark:bg-white/[.08] dark:text-zinc-700"
          >
            {ORG_USERS.length} users
          </span>
        </div>
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
          style={{ backgroundColor: "#34d399" }}
        >
          <UserPlus className="h-3.5 w-3.5" />
          ユーザー招待
        </button>
      </div>

      {/* 検索 + フィルタ */}
      <div className="flex items-center gap-3">
        <div
          className="flex flex-1 items-center gap-2 rounded-lg px-3 py-2 border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900"
        >
          <Search
            className="h-3.5 w-3.5 text-gray-500 dark:text-zinc-500"
          />
          <input
            type="text"
            placeholder="名前・メールで検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs outline-none text-gray-900 dark:text-white"
          />
        </div>

        {/* ロールフィルタ */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-zinc-400"
        >
          <option value="">全ロール</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        {/* ステータスフィルタ */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserStatus | "")}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 outline-none dark:border-white/[.08] dark:bg-zinc-900 dark:text-zinc-400"
        >
          <option value="">全ステータス</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ユーザーテーブル */}
      <div
        className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[.08] dark:bg-zinc-900"
      >
        <table className="w-full text-xs">
          <thead>
            <tr
              className="border-b border-b-gray-200 text-gray-300 dark:border-b-white/[.08] dark:text-zinc-700"
            >
              <th className="px-4 py-3 text-left font-medium">ユーザー</th>
              <th className="px-4 py-3 text-left font-medium">部署</th>
              <th className="px-4 py-3 text-left font-medium">ロール</th>
              <th className="px-4 py-3 text-left font-medium">ステータス</th>
              <th className="px-4 py-3 text-left font-medium">最終ログイン</th>
              <th className="px-4 py-3 text-right font-medium">ツール</th>
              <th className="px-4 py-3 text-right font-medium">リクエスト</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => {
              const role = ROLE_COLORS[user.role];
              const status = STATUS_CONFIG[user.status];
              return (
                <tr
                  key={user.id}
                  className="transition-colors border-b border-b-gray-200 dark:border-b-white/[.08]"
                >
                  {/* ユーザー: アバター + 名前 + メール */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-600 dark:bg-white/[.08] dark:text-zinc-400"
                      >
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div
                          className="text-[10px] text-gray-500 dark:text-zinc-500"
                        >
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 部署 */}
                  <td
                    className="px-4 py-3 text-gray-600 dark:text-zinc-400"
                  >
                    {user.department}
                  </td>

                  {/* ロール pill */}
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${role.bg} ${role.text}`}
                    >
                      {user.role}
                    </span>
                  </td>

                  {/* ステータス */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />
                      <span className="text-gray-600 dark:text-zinc-400">
                        {status.label}
                      </span>
                    </div>
                  </td>

                  {/* 最終ログイン */}
                  <td
                    className="px-4 py-3 font-mono text-gray-400 dark:text-zinc-600"
                  >
                    {user.lastLogin}
                  </td>

                  {/* ツール数 */}
                  <td
                    className="px-4 py-3 text-right font-mono text-gray-600 dark:text-zinc-400"
                  >
                    {user.toolCount}
                  </td>

                  {/* リクエスト数 */}
                  <td
                    className="px-4 py-3 text-right font-mono text-gray-600 dark:text-zinc-400"
                  >
                    {user.requestCount.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* 結果なし */}
        {filtered.length === 0 && (
          <div
            className="py-8 text-center text-xs text-gray-500 dark:text-zinc-500"
          >
            該当するユーザーが見つかりません
          </div>
        )}
      </div>
    </div>
  );
};
