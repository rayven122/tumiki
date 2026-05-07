"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Lock,
  Shield,
  Users,
} from "lucide-react";
import {
  effectBadgeClass,
  getUserById,
  mockOrgUnits,
  sourceBadgeClass,
  sourceLabel,
  type PolicyEffect,
  type MockUser,
} from "./idp-ui-mock-data";

const childCountByParent = mockOrgUnits.reduce<Record<string, number>>(
  (acc, org) => {
    if (org.parentId) acc[org.parentId] = (acc[org.parentId] ?? 0) + 1;
    return acc;
  },
  {},
);

const orgUnitsByParent = mockOrgUnits.reduce<
  Record<string, typeof mockOrgUnits>
>((acc, org) => {
  const parentKey = org.parentId ?? "__root__";
  acc[parentKey] = [...(acc[parentKey] ?? []), org];
  return acc;
}, {});

const depthPaddingClass: Partial<Record<number, string>> = {
  0: "pl-3",
  1: "pl-8",
  2: "pl-14",
  3: "pl-20",
};

const policyValueEffect = {
  許可: "allow",
  拒否: "deny",
  未設定: "unset",
} as const;

const isPolicyValue = (
  value: string,
): value is keyof typeof policyValueEffect => value in policyValueEffect;

const toPolicyEffect = (value: string): PolicyEffect =>
  isPolicyValue(value) ? policyValueEffect[value] : "unset";

export const OrgManagementPanel = ({
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const [selectedOrgId, setSelectedOrgId] = useState("platform");
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    () => new Set(["root", "engineering"]),
  );
  const selectedOrg =
    mockOrgUnits.find((org) => org.id === selectedOrgId) ?? mockOrgUnits[0]!;
  const users = useMemo(
    () =>
      selectedOrg.userIds
        .map(getUserById)
        .filter((user): user is MockUser => Boolean(user)),
    [selectedOrg.userIds],
  );
  const Heading = embedded ? "h2" : "h1";
  const visibleOrgRows = useMemo(() => {
    const rows: { org: (typeof mockOrgUnits)[number]; depth: number }[] = [];

    const appendChildren = (parentId: string | null, depth: number) => {
      const children = orgUnitsByParent[parentId ?? "__root__"] ?? [];
      for (const org of children) {
        rows.push({ org, depth });
        if (expandedOrgIds.has(org.id)) {
          appendChildren(org.id, depth + 1);
        }
      }
    };

    appendChildren(null, 0);
    return rows;
  }, [expandedOrgIds]);

  const toggleExpanded = (orgId: string) => {
    setExpandedOrgIds((current) => {
      const next = new Set(current);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  return (
    <div
      className={
        embedded
          ? "flex min-h-[560px] flex-col md:h-[calc(100vh-220px)] md:flex-row"
          : "flex min-h-screen flex-col md:h-full md:flex-row"
      }
    >
      <aside className="border-r-border-default flex w-full shrink-0 flex-col border-r md:w-[340px]">
        <div className="border-b-border-default border-b px-5 py-4">
          <Heading className="text-text-primary text-lg font-semibold">
            組織
          </Heading>
          <p className="text-text-secondary mt-1 text-xs">
            組織ツリー、継承設定、管理スコープを確認
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {visibleOrgRows.map(({ org, depth }) => {
            const isSelected = selectedOrg.id === org.id;
            const hasChildren = Boolean(childCountByParent[org.id]);
            const isExpanded = expandedOrgIds.has(org.id);
            return (
              <div
                key={org.id}
                className={`border-border-subtle hover:bg-bg-card-hover mb-1 flex min-h-[44px] w-full items-center gap-1 rounded-lg border py-2 pr-3 text-left transition-colors ${
                  isSelected ? "bg-bg-active" : "bg-transparent"
                } ${depthPaddingClass[depth] ?? depthPaddingClass[0]}`}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    aria-label={
                      isExpanded
                        ? `${org.name} を折りたたむ`
                        : `${org.name} を展開`
                    }
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(org.id)}
                    className="text-text-muted hover:text-text-primary flex min-h-[32px] min-w-[32px] items-center justify-center rounded-md"
                  >
                    {isExpanded ? (
                      <ChevronDown size={13} />
                    ) : (
                      <ChevronRight size={13} />
                    )}
                  </button>
                ) : (
                  <span className="min-w-[32px]" />
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrgId(org.id)}
                  className="flex min-h-[32px] min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Building2 size={14} className="text-text-secondary" />
                  <span className="text-text-primary min-w-0 flex-1 truncate text-xs font-medium">
                    {org.name}
                  </span>
                  <span className="text-text-subtle text-[10px]">
                    {org.userIds.length}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${sourceBadgeClass[selectedOrg.source]}`}
              >
                {sourceLabel[selectedOrg.source]}
              </span>
              {selectedOrg.readonly && (
                <span className="bg-bg-active text-text-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]">
                  <Lock size={10} />
                  外部 IdP 由来のため編集不可
                </span>
              )}
            </div>
            <h3 className="text-text-primary text-xl font-semibold">
              {selectedOrg.name}
            </h3>
            <p className="text-text-secondary mt-1 font-mono text-xs">
              {selectedOrg.path}
            </p>
          </div>
          <Link
            href={`/admin/roles?targetType=org&targetId=${selectedOrg.id}`}
            className="bg-btn-primary-bg text-btn-primary-text inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-medium"
          >
            <Shield size={13} />
            権限管理へ
          </Link>
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: GitBranch,
              label: "管理スコープ",
              value: selectedOrg.adminScope,
              sub: "Entra Administrative unit 相当",
            },
            {
              icon: Shield,
              label: "担当管理者",
              value: selectedOrg.delegatedAdmin,
              sub: "この範囲を管理する権限",
            },
            {
              icon: Users,
              label: "対象ユーザー",
              value: `${users.length} 名`,
              sub: selectedOrg.inheritedFrom
                ? `${selectedOrg.inheritedFrom} から継承`
                : "トップレベル組織",
            },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div
              key={label}
              className="bg-bg-card border-border-default rounded-xl border p-4"
            >
              <div className="text-text-muted mb-3 flex items-center gap-2 text-xs">
                <Icon size={13} />
                {label}
              </div>
              <div className="text-text-primary text-sm font-semibold">
                {value}
              </div>
              <div className="text-text-subtle mt-1 text-[10px]">{sub}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
            <div className="border-b-border-default flex items-center justify-between border-b px-5 py-3">
              <h3 className="text-text-primary text-sm font-semibold">
                所属ユーザー
              </h3>
              <button
                type="button"
                disabled
                className="bg-bg-active text-text-muted min-h-[44px] cursor-not-allowed rounded-lg px-3 text-xs"
              >
                ユーザーを移動
              </button>
            </div>
            {users.length === 0 ? (
              <div className="text-text-muted px-5 py-8 text-center text-xs">
                直接所属しているユーザーはいません
              </div>
            ) : (
              users.map((user) => (
                <Link
                  key={user.id}
                  href={`/admin/users/${user.id}`}
                  className="border-b-border-subtle hover:bg-bg-card-hover block space-y-2 border-b px-5 py-3 text-xs transition-colors sm:grid sm:grid-cols-[1fr_150px_120px] sm:items-center sm:gap-3 sm:space-y-0"
                >
                  <div className="min-w-0">
                    <div className="text-text-primary font-medium">
                      {user.name}
                    </div>
                    <div className="text-text-muted truncate text-[10px]">
                      {user.email}
                    </div>
                  </div>
                  <span className="text-text-secondary">{user.title}</span>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${sourceBadgeClass[user.source]}`}
                  >
                    {sourceLabel[user.source]}
                  </span>
                </Link>
              ))
            )}
          </section>

          <div className="space-y-4">
            <section className="bg-bg-card border-border-default rounded-xl border p-4">
              <h3 className="text-text-primary mb-3 text-sm font-semibold">
                親組織
              </h3>
              <select
                aria-label="親組織"
                value={selectedOrg.parentId ?? ""}
                disabled
                className="bg-bg-input border-border-default text-text-secondary w-full rounded-lg border px-3 py-2 text-xs outline-none"
              >
                <option value="">トップレベル</option>
                {mockOrgUnits
                  .filter((org) => org.id !== selectedOrg.id)
                  .map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
              </select>
              <p className="text-text-muted mt-2 text-[10px]">
                外部 IdP 由来の組織は基本編集不可。Tumiki
                側の補正が必要な場合だけ親組織を変更します。
              </p>
            </section>

            <section className="bg-bg-card border-border-default rounded-xl border p-4">
              <h3 className="text-text-primary mb-3 text-sm font-semibold">
                継承中の MCP 設定
              </h3>
              <div className="space-y-2">
                {selectedOrg.policies.map((policy) => (
                  <div
                    key={policy.label}
                    className="bg-bg-active flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                  >
                    <span className="text-text-secondary text-xs">
                      {policy.label}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        effectBadgeClass[toPolicyEffect(policy.value)]
                      }`}
                    >
                      {policy.value}
                      {policy.inherited ? " / 継承" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};
