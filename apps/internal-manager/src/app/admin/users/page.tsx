"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Role } from "@tumiki/internal-db";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@tumiki/ui/alert-dialog";
import {
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
  Users2,
} from "lucide-react";
import { USER_LIST_LIMIT } from "@/lib/user-management";
import { api, type RouterOutputs } from "~/trpc/react";
import { GroupsManagementPanel } from "../_components/GroupsManagementPanel";

type RoleFilter = "SYSTEM_ADMIN" | "USER" | "all";
type StatusFilter = "true" | "false" | "all";
type DirectoryTab = "users" | "groups";

const ROLE_STYLES: Record<string, { text: string; label: string } | undefined> =
  {
    SYSTEM_ADMIN: {
      text: "text-emerald-400",
      label: "オーナー",
    },
    USER: { text: "text-amber-400", label: "メンバー" },
  };

const DEFAULT_ROLE_STYLE = {
  text: "text-amber-400",
  label: "メンバー",
};

const ActionTooltip = ({ id, text }: { id: string; text: string }) => (
  <span
    id={id}
    role="tooltip"
    className="bg-bg-card border-border-default text-text-secondary pointer-events-none absolute top-1/2 right-full z-[100] mr-2 hidden w-72 -translate-y-1/2 rounded-md border px-2.5 py-2 text-left text-[11px] leading-relaxed shadow-lg group-focus-within:block group-hover:block"
  >
    {text}
  </span>
);

const SYNC_SOURCE_LABELS: Record<string, string | undefined> = {
  entra: "Entra ID",
  google: "Google",
  keycloak: "Keycloak",
  okta: "Okta",
  oidc: "OIDC",
  saml: "SAML",
  scim: "SCIM",
};

const formatDate = (value: Date | string | null) =>
  value ? new Date(value).toLocaleDateString("ja-JP") : "—";

const getUserActionErrorMessage = (error: {
  data?: { code?: string } | null;
  message: string;
}) => {
  if (error.data?.code === "BAD_REQUEST" || error.data?.code === "NOT_FOUND") {
    return error.message;
  }

  return "操作に失敗しました。時間をおいて再試行してください。";
};

type UserListItem = RouterOutputs["users"]["list"][number];

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
    onError: (error) => setErrorMessage(getUserActionErrorMessage(error)),
  });
  const updateRole = api.users.updateRole.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await utils.users.list.invalidate();
    },
    onError: (error) => setErrorMessage(getUserActionErrorMessage(error)),
  });
  const deleteUser = api.users.deleteUser.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await utils.users.list.invalidate();
    },
    onError: (error) => setErrorMessage(getUserActionErrorMessage(error)),
  });

  const isMutating =
    updateActive.isPending || updateRole.isPending || deleteUser.isPending;
  const isUserListAtLimit = users.length === USER_LIST_LIMIT;
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
      const syncSource = user.externalIdentities[0]?.provider;
      const syncSourceLabel = syncSource
        ? (SYNC_SOURCE_LABELS[syncSource.toLowerCase()] ?? syncSource)
        : "Tumiki";
      const accessTooltipId = `${user.id}-access`;
      const deleteTooltipId = `${user.id}-delete`;
      const accessActionTooltip =
        isSelf && user.isActive
          ? "自分自身のアクセスは停止できません。別の管理者に操作してもらってください。"
          : user.isActive
            ? "このユーザーの internal-manager と Tumiki Desktop の利用を停止します。IdP 側のユーザーは削除されません。"
            : "このユーザーの internal-manager と Tumiki Desktop の利用を再開します。";
      const deleteTooltip = user.isActive
        ? "利用中ユーザーは削除できません。先にアクセスを停止してください。"
        : user._count.externalIdentities > 0
          ? "SAML/SCIM/IdPで同期されたユーザーはTumikiから削除できません。IdP側で削除してください。"
          : "Tumikiで追加されたアクセス停止中ユーザーを削除します。削除すると一覧から消え、この操作は取り消せません。";
      return (
        <div
          key={user.id}
          className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[minmax(180px,1fr)_130px_90px_100px_72px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors last:border-b-0"
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
              <div className="text-text-subtle mt-0.5 text-[10px]">
                最終ログイン: {formatDate(user.lastLoginAt)} / グループ:{" "}
                {user._count.groupMemberships}
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
                  role: e.target.value as Role,
                })
              }
              className={`border-border-default bg-bg-card w-[120px] rounded-md border px-2 py-1 text-[11px] outline-none disabled:cursor-not-allowed disabled:opacity-50 ${role.text}`}
              aria-label={`${user.name ?? user.email ?? "ユーザー"}のロール`}
            >
              <option value="SYSTEM_ADMIN">
                {ROLE_STYLES.SYSTEM_ADMIN?.label}
              </option>
              <option value="USER">{ROLE_STYLES.USER?.label}</option>
            </select>
          </div>
          <div className="text-text-secondary text-[11px]">
            {syncSourceLabel}
          </div>
          <div className="text-text-secondary font-mono text-[11px]">
            {formatDate(user.lastUsedAt)}
          </div>
          <div className="flex justify-end gap-1.5">
            <span
              className="group relative inline-flex"
              tabIndex={isMutating || (isSelf && user.isActive) ? 0 : undefined}
              aria-describedby={
                isMutating || (isSelf && user.isActive)
                  ? accessTooltipId
                  : undefined
              }
            >
              <button
                type="button"
                disabled={isMutating || (isSelf && user.isActive)}
                onClick={() =>
                  updateActive.mutate({
                    userId: user.id,
                    isActive: !user.isActive,
                  })
                }
                className={`flex min-h-[44px] w-11 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  user.isActive
                    ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                }`}
                aria-label={`${user.name ?? user.email ?? "ユーザー"}のアクセスを${
                  user.isActive ? "停止" : "再開"
                }`}
                aria-describedby={accessTooltipId}
              >
                {user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
              </button>
              <ActionTooltip id={accessTooltipId} text={accessActionTooltip} />
            </span>
            {!user.isActive && (
              <span
                className="group relative inline-flex"
                tabIndex={!canDelete ? 0 : undefined}
                aria-describedby={!canDelete ? deleteTooltipId : undefined}
              >
                {canDelete ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        type="button"
                        disabled={isMutating}
                        className="border-border-default bg-bg-card text-text-muted flex min-h-[44px] w-11 items-center justify-center rounded-md border transition-colors hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={`${user.name ?? user.email ?? "ユーザー"}を削除`}
                        aria-describedby={deleteTooltipId}
                      >
                        <Trash2 size={12} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ユーザーを削除しますか？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          {user.name ?? user.email ?? "ユーザー"}を削除します。
                          この操作は取り消せません。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteUser.mutate({ userId: user.id })}
                          className="bg-red-600 text-white hover:bg-red-500"
                        >
                          削除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="border-border-default bg-bg-card text-text-muted flex min-h-[44px] w-11 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`${user.name ?? user.email ?? "ユーザー"}を削除`}
                    aria-describedby={deleteTooltipId}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
                <ActionTooltip id={deleteTooltipId} text={deleteTooltip} />
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
      <div className="bg-bg-card border-border-default rounded-xl border">
        <div className="border-b-border-default text-text-subtle grid grid-cols-[minmax(180px,1fr)_130px_90px_100px_72px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
          <span>ユーザー</span>
          <span>ロール</span>
          <span>同期元</span>
          <span>最終利用</span>
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
                aria-label="名前またはメールアドレスで検索"
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
              aria-label="ロールで絞り込み"
            >
              <option value="all">すべてのロール</option>
              <option value="SYSTEM_ADMIN">オーナー</option>
              <option value="USER">メンバー</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="bg-bg-card border-border-default text-text-secondary rounded-lg border px-3 py-1.5 text-xs outline-none"
              aria-label="アクセス状態で絞り込み"
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

          {isUserListAtLimit && (
            <div
              role="status"
              className="border-border-default bg-bg-card text-text-secondary rounded-lg border px-3 py-2 text-xs"
            >
              表示上限の{USER_LIST_LIMIT}
              名に達している可能性があります。検索またはフィルターで対象を絞り込んでください。
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
