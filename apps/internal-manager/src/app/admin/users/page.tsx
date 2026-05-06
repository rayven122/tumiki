"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Power,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  Users2,
} from "lucide-react";
import { api } from "~/trpc/react";
import { GroupsManagementPanel } from "../_components/GroupsManagementPanel";

type RoleFilter = "SYSTEM_ADMIN" | "USER" | "all";
type StatusFilter = "true" | "false" | "all";
type DirectoryTab = "users" | "groups";

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

type UserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: "SYSTEM_ADMIN" | "USER";
  isActive: boolean;
  lastLoginAt: Date | string | null;
  _count: { externalIdentities: number; groupMemberships: number };
};

const AdminUsersPage = () => {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [activeTab, setActiveTab] = useState<DirectoryTab>("users");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: users = [], isLoading } = api.users.list.useQuery({
    search: debouncedSearch || undefined,
    role: roleFilter,
    isActive: statusFilter,
  });

  const updateActive = api.users.updateActive.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await utils.users.list.invalidate();
    },
    onError: (error) => setErrorMessage(error.message),
  });
  const updateRole = api.users.updateRole.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await utils.users.list.invalidate();
    },
    onError: (error) => setErrorMessage(error.message),
  });
  const deleteUser = api.users.deleteUser.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await utils.users.list.invalidate();
    },
    onError: (error) => setErrorMessage(error.message),
  });

  const isMutating =
    updateActive.isPending || updateRole.isPending || deleteUser.isPending;
  const activeUsers = users.filter((user) => user.isActive);
  const suspendedUsers = users.filter((user) => !user.isActive);
  const shouldShowActiveUsers = statusFilter !== "false";
  const shouldShowSuspendedUsers = statusFilter !== "true";

  const renderUserRows = (sectionUsers: UserListItem[]) => {
    if (sectionUsers.length === 0) {
      return (
        <div className="text-text-muted py-8 text-center text-sm">
          該当するユーザーはいません
        </div>
      );
    }

    return sectionUsers.map((user) => {
      const role = ROLE_STYLES[user.role] ?? DEFAULT_ROLE_STYLE;
      const isSelf = user.id === session?.user?.id;
      const canDelete = !user.isActive && user._count.externalIdentities === 0;
      const deleteTooltip = user.isActive
        ? "利用中ユーザーは削除できません。先にアクセスを停止してください。"
        : user._count.externalIdentities > 0
          ? "SAML/SCIM/IdPで同期されたユーザーはTumikiから削除できません。IdP側で削除してください。"
          : "Tumikiで追加されたアクセス停止中ユーザーを削除します。";
      return (
        <div
          key={user.id}
          className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[minmax(220px,1fr)_150px_120px_130px_70px_88px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors last:border-b-0"
        >
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
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className={role.text} />
            <select
              value={user.role}
              disabled={isMutating || isSelf}
              onChange={(e) =>
                updateRole.mutate({
                  userId: user.id,
                  role: e.target.value as "SYSTEM_ADMIN" | "USER",
                })
              }
              className={`border-border-default bg-bg-card w-[120px] rounded-md border px-2 py-1 text-[11px] outline-none disabled:cursor-not-allowed disabled:opacity-50 ${role.text}`}
              aria-label={`${user.name ?? user.email ?? "ユーザー"}のロール`}
            >
              <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>
          <div>
            <span
              className={`inline-flex min-w-[96px] items-center justify-center rounded-md px-2 py-1 text-[11px] font-medium ${
                user.isActive
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-zinc-700/40 text-zinc-300"
              }`}
            >
              {user.isActive ? "利用中" : "アクセス停止中"}
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
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              disabled={isMutating || (isSelf && user.isActive)}
              onClick={() =>
                updateActive.mutate({
                  userId: user.id,
                  isActive: !user.isActive,
                })
              }
              className={`flex min-h-[28px] w-[72px] items-center justify-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                user.isActive
                  ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
              }`}
              aria-label={`${user.name ?? user.email ?? "ユーザー"}のアクセスを${
                user.isActive ? "停止" : "再開"
              }`}
            >
              <Power size={12} />
              {user.isActive ? "停止" : "再開"}
            </button>
            {!user.isActive && (
              <span title={deleteTooltip}>
                <button
                  type="button"
                  title={deleteTooltip}
                  disabled={isMutating || !canDelete}
                  onClick={() => {
                    if (
                      window.confirm(
                        `${user.name ?? user.email ?? "ユーザー"}を削除します。この操作は取り消せません。`,
                      )
                    ) {
                      deleteUser.mutate({ userId: user.id });
                    }
                  }}
                  className="border-border-default bg-bg-card text-text-muted flex min-h-[28px] w-8 items-center justify-center rounded-md border transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`${user.name ?? user.email ?? "ユーザー"}を削除`}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  const renderUserSection = ({
    title,
    description,
    sectionUsers,
  }: {
    title: string;
    description: string;
    sectionUsers: UserListItem[];
  }) => (
    <section className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-text-primary text-sm font-semibold">{title}</h2>
          <p className="text-text-muted mt-0.5 text-xs">{description}</p>
        </div>
        <span className="text-text-subtle text-xs">
          {sectionUsers.length} 名
        </span>
      </div>
      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        <div className="border-b-border-default text-text-subtle grid grid-cols-[minmax(220px,1fr)_150px_120px_130px_70px_88px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
          <span>ユーザー</span>
          <span>ロール</span>
          <span>アクセス</span>
          <span>最終ログイン</span>
          <span className="text-right">グループ</span>
          <span className="text-right">操作</span>
        </div>
        {renderUserRows(sectionUsers)}
      </div>
    </section>
  );

  return (
    <div className="space-y-4 p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-text-primary text-lg font-semibold">
            {activeTab === "groups" ? "グループ管理" : "ユーザー管理"}
          </h1>
          {activeTab === "users" && (
            <p className="text-text-secondary mt-1 text-xs">
              全{users.length}名のメンバー
            </p>
          )}
        </div>
      </div>

      <div className="border-border-default bg-bg-card inline-flex rounded-lg border p-1">
        {(
          [
            { id: "users", label: "ユーザー", icon: Users },
            { id: "groups", label: "グループ", icon: Users2 },
          ] as { id: DirectoryTab; label: string; icon: typeof Users }[]
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex min-h-[36px] items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${
              activeTab === id
                ? "bg-bg-active text-text-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "groups" ? (
        <div className="border-border-default bg-bg-card overflow-hidden rounded-xl border">
          <GroupsManagementPanel embedded />
        </div>
      ) : (
        <>
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
              <option value="all">すべてのアクセス状態</option>
              <option value="true">利用中</option>
              <option value="false">アクセス停止中</option>
            </select>
            <span className="text-text-subtle ml-auto text-xs">
              {users.length} 名表示
            </span>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
            >
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="bg-bg-card border-border-default text-text-muted rounded-xl border py-12 text-center text-sm">
              読み込み中…
            </div>
          ) : users.length === 0 ? (
            <div className="bg-bg-card border-border-default text-text-muted rounded-xl border py-12 text-center text-sm">
              該当するユーザーはいません
            </div>
          ) : (
            <div className="space-y-5">
              {shouldShowActiveUsers &&
                renderUserSection({
                  title: "利用中ユーザー",
                  description:
                    "internal-manager と Tumiki Desktop の利用を許可しているユーザーです。",
                  sectionUsers: activeUsers,
                })}
              {shouldShowSuspendedUsers &&
                renderUserSection({
                  title: "アクセス停止中ユーザー",
                  description:
                    "IdP には存在していても、internal-manager と Tumiki Desktop の利用を停止しているユーザーです。",
                  sectionUsers: suspendedUsers,
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminUsersPage;
