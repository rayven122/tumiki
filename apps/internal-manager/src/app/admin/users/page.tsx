"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus } from "lucide-react";
import { api } from "~/trpc/react";

type RoleFilter = "SYSTEM_ADMIN" | "USER" | "all";
type StatusFilter = "true" | "false" | "all";

const ROLE_STYLES: Record<
  string,
  { bg: string; text: string; label: string } | undefined
> = {
  SYSTEM_ADMIN: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    label: "Admin",
  },
  USER: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Member" },
};

const DEFAULT_ROLE_STYLE = {
  bg: "bg-amber-500/15",
  text: "text-amber-400",
  label: "Member",
};

const AdminUsersPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: users = [], isLoading } = api.users.list.useQuery({
    search: debouncedSearch || undefined,
    role: roleFilter,
    isActive: statusFilter,
  });

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-lg font-semibold">
            ユーザー管理
          </h1>
          <p className="text-text-secondary mt-1 text-xs">
            全{users.length}名のメンバー
          </p>
        </div>
        <button
          type="button"
          className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
        >
          <UserPlus size={13} />
          ユーザー招待
        </button>
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search
            size={12}
            className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="名前・メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bg-card border-border-default text-text-secondary w-[220px] rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのロール</option>
          <option value="SYSTEM_ADMIN">Admin</option>
          <option value="USER">Member</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのステータス</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <span className="text-text-subtle ml-auto text-xs">
          {users.length} 名表示
        </span>
      </div>

      {/* テーブル */}
      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        {/* ヘッダー行 */}
        <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_110px_120px_130px_80px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
          <span>ユーザー</span>
          <span>ロール</span>
          <span>ステータス</span>
          <span>最終ログイン</span>
          <span className="text-right">グループ</span>
        </div>

        {isLoading ? (
          <div className="text-text-muted py-12 text-center text-sm">
            読み込み中…
          </div>
        ) : users.length === 0 ? (
          <div className="text-text-muted py-12 text-center text-sm">
            該当するユーザーはいません
          </div>
        ) : (
          users.map((user) => {
            const role = ROLE_STYLES[user.role] ?? DEFAULT_ROLE_STYLE;
            return (
              <div
                key={user.id}
                className="border-b-border-subtle grid grid-cols-[1fr_110px_120px_130px_80px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors hover:bg-white/[0.02]"
              >
                {/* ユーザー */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-bg-active text-text-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {(user.name ?? user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-text-primary font-medium">
                      {user.name ?? "—"}
                    </div>
                    <div className="text-text-muted text-[10px]">
                      {user.email ?? "—"}
                    </div>
                  </div>
                </div>
                <span
                  className={`inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${role.bg} ${role.text}`}
                >
                  {role.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-zinc-500"}`}
                  />
                  <span className="text-text-secondary">
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <span className="text-text-muted font-mono text-[11px]">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString("ja-JP")
                    : "—"}
                </span>
                <span className="text-text-secondary text-right font-mono">
                  {user._count.groupMemberships}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
