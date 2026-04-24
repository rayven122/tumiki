"use client";

import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import {
  ORG_USERS,
  type UserRole,
  type UserStatus,
} from "../_components/mock-data";

const ROLE_STYLES: Record<UserRole, { bg: string; text: string }> = {
  Admin: { bg: "bg-emerald-500/15", text: "text-emerald-400" },
  Manager: { bg: "bg-blue-500/15", text: "text-blue-400" },
  Developer: { bg: "bg-purple-500/15", text: "text-purple-400" },
  Member: { bg: "bg-amber-500/15", text: "text-amber-400" },
};

const STATUS_CONFIG: Record<UserStatus, { dot: string; label: string }> = {
  active: { dot: "bg-emerald-400", label: "Active" },
  inactive: { dot: "bg-zinc-500", label: "Inactive" },
  suspended: { dot: "bg-red-400", label: "Suspended" },
};

const AdminUsersPage = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");

  const filtered = ORG_USERS.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (statusFilter === "all" || u.status === statusFilter) &&
      (search === "" ||
        u.name.includes(search) ||
        u.email.includes(search) ||
        u.department.includes(search)),
  );

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-lg font-semibold">
            ユーザー管理
          </h1>
          <p className="text-text-secondary mt-1 text-xs">
            全{ORG_USERS.length}名のメンバー
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
            placeholder="名前・メール・部署で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-bg-card border-border-default text-text-secondary rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
            style={{ width: 220 }}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | "all")}
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのロール</option>
          <option value="Admin">Admin</option>
          <option value="Manager">Manager</option>
          <option value="Developer">Developer</option>
          <option value="Member">Member</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as UserStatus | "all")
          }
          className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
        >
          <option value="all">すべてのステータス</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <span className="text-text-subtle ml-auto text-xs">
          {filtered.length} 名表示
        </span>
      </div>

      {/* テーブル */}
      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        {/* ヘッダー行 */}
        <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_130px_100px_120px_110px_70px_70px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
          <span>ユーザー</span>
          <span>部署</span>
          <span>ロール</span>
          <span>ステータス</span>
          <span>最終ログイン</span>
          <span className="text-right">ツール</span>
          <span className="text-right">リクエスト</span>
        </div>

        {filtered.length === 0 ? (
          <div className="text-text-muted py-12 text-center text-sm">
            該当するユーザーはいません
          </div>
        ) : (
          filtered.map((user) => {
            const role = ROLE_STYLES[user.role];
            const status = STATUS_CONFIG[user.status];
            return (
              <div
                key={user.id}
                className="border-b-border-subtle grid grid-cols-[1fr_130px_100px_120px_110px_70px_70px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors hover:bg-white/[0.02]"
              >
                {/* ユーザー */}
                <div className="flex items-center gap-2.5">
                  <div className="bg-bg-active text-text-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-text-primary font-medium">
                      {user.name}
                    </div>
                    <div className="text-text-muted text-[10px]">
                      {user.email}
                    </div>
                  </div>
                </div>
                <span className="text-text-secondary">{user.department}</span>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${role.bg} ${role.text}`}
                >
                  {user.role}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                  <span className="text-text-secondary">{status.label}</span>
                </div>
                <span className="text-text-muted font-mono text-[11px]">
                  {user.lastLogin}
                </span>
                <span className="text-text-secondary text-right font-mono">
                  {user.toolCount}
                </span>
                <span className="text-text-secondary text-right font-mono">
                  {user.requestCount.toLocaleString()}
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
