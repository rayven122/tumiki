"use client";

import Link from "next/link";
import {
  AlertCircle,
  GitBranch,
  Loader2,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { api } from "~/trpc/react";
import {
  getEffectBadgeClass,
  getEffectLabel,
  getRiskLabel,
  getUserLabel,
  sourceBadgeClass,
  sourceKindLabel,
  sourceLabel,
} from "./permission-display-utils";

const formatDateTime = (value: Date | string | null) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const UserDetailPanel = ({ userId }: { userId: string }) => {
  const userQuery = api.users.getDetail.useQuery({ userId });
  const permissionSummaryQuery =
    api.mcpPolicies.getTargetPermissionSummary.useQuery({
      targetType: "user",
      targetId: userId,
    });

  const user = userQuery.data;
  const permissionSummary = permissionSummaryQuery.data;
  const isLoading = userQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[480px] items-center justify-center gap-2 p-6">
        <Loader2 size={16} className="text-text-muted animate-spin" />
        <span className="text-text-muted text-xs">ユーザーを読み込み中</span>
      </div>
    );
  }

  if (userQuery.isError) {
    return (
      <div className="flex min-h-[480px] items-center justify-center p-6">
        <div className="text-text-muted flex items-center gap-2 text-xs">
          <AlertCircle size={14} />
          ユーザー詳細を取得できませんでした
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[480px] items-center justify-center p-6">
        <p className="text-text-muted text-xs">ユーザーが見つかりません</p>
      </div>
    );
  }

  const primaryOrg =
    user.orgUnitMemberships.find((membership) => membership.isPrimary) ??
    user.orgUnitMemberships[0] ??
    null;
  const syncSource = user.externalIdentities[0]?.provider ?? "Tumiki";

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="bg-bg-active text-text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-semibold">
            {[...getUserLabel(user)][0] ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="bg-bg-active text-text-secondary rounded-full px-2.5 py-1 text-[10px]">
                {syncSource}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] ${
                  user.isActive
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-zinc-500/20 text-zinc-300"
                }`}
              >
                {user.isActive ? "Active" : "Suspended"}
              </span>
            </div>
            <h1 className="text-text-primary truncate text-xl font-semibold">
              {getUserLabel(user)}
            </h1>
            <p className="text-text-secondary mt-1 truncate text-xs">
              {user.email ?? "メール未設定"} / {user.role}
            </p>
          </div>
        </div>
        <Link
          href="/admin/users"
          className="bg-bg-active text-text-secondary inline-flex min-h-[44px] shrink-0 items-center rounded-lg px-3 text-xs"
        >
          ユーザー一覧へ
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {[
          {
            icon: GitBranch,
            label: "所属組織",
            value: primaryOrg?.orgUnit.name ?? "未所属",
            sub: primaryOrg?.orgUnit.path ?? "—",
          },
          {
            icon: Users,
            label: "所属グループ",
            value: `${user.groupMemberships.length} 件`,
            sub: "横断チームと IdP グループ",
          },
          {
            icon: Shield,
            label: "ユーザー個別設定",
            value: permissionSummaryQuery.isError
              ? "取得失敗"
              : permissionSummary
                ? `${permissionSummary.summary.userOverrideCount} 件`
                : "0 件",
            sub: "ユーザー単位の許可 / 拒否",
          },
          {
            icon: Shield,
            label: "最終的な許可 / 拒否",
            value: permissionSummaryQuery.isError
              ? "取得失敗"
              : permissionSummary
                ? `許可 ${permissionSummary.summary.allowCount} / 拒否 ${permissionSummary.summary.denyCount}`
                : "許可 0 / 拒否 0",
            sub: permissionSummaryQuery.isError
              ? "権限設定を取得できませんでした"
              : `未設定 ${permissionSummary?.summary.unsetCount ?? 0}`,
          },
        ].map(({ icon: Icon, label, value, sub }) => (
          <section
            key={label}
            className="bg-bg-card border-border-default rounded-xl border p-4"
          >
            <div className="text-text-muted mb-3 flex items-center gap-2 text-xs">
              <Icon size={13} />
              {label}
            </div>
            <div className="text-text-primary truncate text-sm font-semibold">
              {value}
            </div>
            <div className="text-text-subtle mt-1 truncate text-[10px]">
              {sub}
            </div>
          </section>
        ))}
      </div>

      <div className="space-y-4">
        <section className="bg-bg-card border-border-default rounded-xl border p-4">
          <h2 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserRound size={14} />
            このユーザーについて
          </h2>
          <div className="grid gap-2 md:grid-cols-4">
            <div className="bg-bg-active rounded-lg px-3 py-3">
              <div className="text-text-muted text-[10px]">同期元</div>
              <div className="text-text-primary mt-1 truncate text-xs">
                {syncSource}
              </div>
            </div>
            <div className="bg-bg-active rounded-lg px-3 py-3">
              <div className="text-text-muted text-[10px]">最終ログイン</div>
              <div className="text-text-primary mt-1 truncate text-xs">
                {formatDateTime(user.lastLoginAt)}
              </div>
            </div>
            <div className="bg-bg-active rounded-lg px-3 py-3">
              <div className="text-text-muted text-[10px]">最終利用</div>
              <div className="text-text-primary mt-1 truncate text-xs">
                {formatDateTime(user.lastUsedAt)}
              </div>
            </div>
            <div className="bg-bg-active rounded-lg px-3 py-3">
              <div className="text-text-muted text-[10px]">SCIM manager</div>
              <div className="text-text-primary mt-1 truncate text-xs">
                {user.scimManagerDisplayName ?? "—"}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
            <div className="border-b-border-default border-b px-5 py-3">
              <h2 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
                <GitBranch size={14} />
                所属組織
              </h2>
            </div>
            {user.orgUnitMemberships.length === 0 ? (
              <div className="text-text-muted px-5 py-8 text-center text-xs">
                所属組織がありません
              </div>
            ) : (
              user.orgUnitMemberships.map((membership) => (
                <Link
                  key={membership.id}
                  href="/admin/directory?tab=organizations"
                  className="border-b-border-subtle hover:bg-bg-card-hover block border-b px-5 py-3 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary min-w-0 flex-1 truncate font-medium">
                      {membership.orgUnit.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${
                        sourceBadgeClass[membership.orgUnit.source]
                      }`}
                    >
                      {sourceLabel[membership.orgUnit.source]}
                    </span>
                  </div>
                  <div className="text-text-muted mt-1 truncate font-mono text-[10px]">
                    {membership.orgUnit.path}
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
            <div className="border-b-border-default border-b px-5 py-3">
              <h2 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
                <Users size={14} />
                所属グループ
              </h2>
            </div>
            {user.groupMemberships.length === 0 ? (
              <div className="text-text-muted px-5 py-8 text-center text-xs">
                所属グループがありません
              </div>
            ) : (
              user.groupMemberships.map((membership) => (
                <Link
                  key={membership.id}
                  href="/admin/directory?tab=groups"
                  className="border-b-border-subtle hover:bg-bg-card-hover block border-b px-5 py-3 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-text-primary min-w-0 flex-1 truncate font-medium">
                      {membership.group.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${
                        sourceBadgeClass[membership.group.source]
                      }`}
                    >
                      {sourceLabel[membership.group.source]}
                    </span>
                  </div>
                  <div className="text-text-muted mt-1 truncate text-[10px]">
                    {membership.group.description ?? "説明なし"}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
          <div className="border-b-border-default flex items-center justify-between gap-3 border-b px-5 py-3">
            <h2 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
              <Shield size={14} />
              適用中のロール / 権限設定
            </h2>
            <span className="text-text-subtle text-[10px]">
              ユーザー個別設定と所属組織・グループから集計
            </span>
          </div>
          {permissionSummaryQuery.isLoading ? (
            <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
              <Loader2 size={14} className="animate-spin" />
              権限設定を読み込み中
            </div>
          ) : permissionSummaryQuery.isError ? (
            <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
              <AlertCircle size={14} />
              権限設定を取得できませんでした
            </div>
          ) : !permissionSummary || permissionSummary.settings.length === 0 ? (
            <div className="text-text-muted px-5 py-8 text-center text-xs">
              適用中の権限設定はありません
            </div>
          ) : (
            permissionSummary.settings.map((setting) => (
              <div
                key={setting.id}
                className="border-b-border-subtle grid gap-2 border-b px-5 py-3 text-xs md:grid-cols-[1fr_100px_140px]"
              >
                <div className="min-w-0">
                  <div className="text-text-primary truncate font-medium">
                    {setting.toolName ?? setting.catalogName}
                  </div>
                  <div className="text-text-muted mt-1 truncate text-[10px]">
                    {setting.toolName ? setting.catalogName : "カタログ"}
                  </div>
                </div>
                <span
                  className={`h-fit w-fit rounded-full px-2 py-0.5 text-[10px] ${getEffectBadgeClass(
                    setting.effect,
                  )}`}
                >
                  {getEffectLabel(setting.effect)}
                </span>
                <span className="text-text-muted text-[10px]">
                  {sourceKindLabel[setting.sourceKind]}
                </span>
              </div>
            ))
          )}
        </section>

        <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
          <div className="border-b-border-default flex items-center justify-between gap-3 border-b px-5 py-3">
            <h2 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
              <Shield size={14} />
              最終的な許可 / 拒否
            </h2>
            {permissionSummary ? (
              <span className="text-text-subtle text-[10px]">
                拒否は許可より優先
              </span>
            ) : null}
          </div>
          <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_80px_80px_160px] items-center gap-3 border-b px-5 py-2.5 text-[10px] md:grid">
            <span>提供ツール</span>
            <span>リスク</span>
            <span>結果</span>
            <span>理由</span>
          </div>
          {permissionSummaryQuery.isLoading ? (
            <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
              <Loader2 size={14} className="animate-spin" />
              権限設定を読み込み中
            </div>
          ) : permissionSummaryQuery.isError ? (
            <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
              <AlertCircle size={14} />
              権限設定を取得できませんでした
            </div>
          ) : !permissionSummary || permissionSummary.finalRows.length === 0 ? (
            <div className="text-text-muted px-5 py-8 text-center text-xs">
              表示できるツール権限がありません
            </div>
          ) : (
            permissionSummary.finalRows.map((row) => (
              <div
                key={row.id}
                className="border-b-border-subtle hover:bg-bg-card-hover grid gap-2 border-b px-5 py-3 text-xs transition-colors md:grid-cols-[1fr_80px_80px_160px]"
              >
                <div className="min-w-0">
                  <div className="text-text-primary truncate font-medium">
                    {row.toolName}
                  </div>
                  <div className="text-text-muted mt-1 truncate font-mono text-[10px]">
                    {row.catalogName}
                  </div>
                </div>
                <span className="text-text-secondary text-[10px]">
                  {getRiskLabel(row.riskLevel)}
                </span>
                <span
                  className={`h-fit w-fit rounded-full px-2 py-0.5 text-[10px] ${getEffectBadgeClass(
                    row.effect,
                  )}`}
                >
                  {getEffectLabel(row.effect)}
                </span>
                <span className="text-text-muted text-[10px]">
                  {row.reason}
                </span>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
};
