"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Minus,
  Search,
  Shield,
  User,
  Users,
  X,
} from "lucide-react";
import {
  effectBadgeClass,
  mockGroups,
  mockOrgUnits,
  mockTools,
  mockUsers,
  sourceBadgeClass,
  sourceLabel,
  type IdpSource,
  type MockGroup,
  type MockOrgUnit,
  type MockUser,
  type PolicyEffect,
} from "../_components/idp-ui-mock-data";

type TargetType = "org" | "group" | "user";

type PolicyTarget =
  | { type: "org"; item: MockOrgUnit; depth: number }
  | { type: "group"; item: MockGroup; depth: number }
  | { type: "user"; item: MockUser; depth: number };

type SelectedTarget = {
  type: TargetType;
  id: string;
};

const effectConfig: Record<
  PolicyEffect,
  { label: string; icon: typeof Check; className: string }
> = {
  allow: {
    label: "許可",
    icon: Check,
    className: effectBadgeClass.allow,
  },
  deny: { label: "拒否", icon: X, className: effectBadgeClass.deny },
  unset: {
    label: "未設定",
    icon: Minus,
    className: effectBadgeClass.unset,
  },
};

const riskClass = {
  low: "bg-emerald-500/15 text-emerald-300",
  medium: "bg-amber-500/15 text-amber-300",
  high: "bg-red-500/15 text-red-300",
} as const;

const targetLabel: Record<TargetType, string> = {
  org: "階層組織",
  group: "横断グループ",
  user: "ユーザー例外",
};

const targetDescription: Record<TargetType, string> = {
  org: "標準権限として下位組織に継承されます",
  group: "組織階層をまたぐ例外権限です",
  user: "緊急対応や一時的な個別上書きに限定します",
};

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

const isTargetType = (value: string | null): value is TargetType =>
  value === "org" || value === "group" || value === "user";

const getDefaultTargetId = (type: TargetType) => {
  if (type === "org") return "platform";
  if (type === "group") return "security-reviewers";
  return "user-mina";
};

const getTargetName = (target: PolicyTarget) => target.item.name;

const getTargetSub = (target: PolicyTarget) => {
  if (target.type === "org") return target.item.path;
  if (target.type === "group") return target.item.description;
  return target.item.email;
};

const getTargetSource = (target: PolicyTarget): IdpSource => target.item.source;

const AdminRolesContent = () => {
  const searchParams = useSearchParams();
  const queryTargetType = searchParams.get("targetType");
  const initialTargetType = isTargetType(queryTargetType)
    ? queryTargetType
    : "org";
  const initialTargetId =
    searchParams.get("targetId") ?? getDefaultTargetId(initialTargetType);

  const [selectedTarget, setSelectedTarget] = useState<SelectedTarget>({
    type: initialTargetType,
    id: initialTargetId,
  });
  const [search, setSearch] = useState("");
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    () => new Set(["root", "engineering"]),
  );

  const targets = useMemo(() => {
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      const orgTargets: PolicyTarget[] = mockOrgUnits
        .filter(
          (org) =>
            org.name.includes(normalizedSearch) ||
            org.path.includes(normalizedSearch) ||
            sourceLabel[org.source].includes(normalizedSearch),
        )
        .map((org) => ({ type: "org", item: org, depth: 0 }));
      const groupTargets: PolicyTarget[] = mockGroups
        .filter(
          (group) =>
            group.name.includes(normalizedSearch) ||
            group.description.includes(normalizedSearch) ||
            sourceLabel[group.source].includes(normalizedSearch),
        )
        .map((group) => ({ type: "group", item: group, depth: 0 }));
      const userTargets: PolicyTarget[] = mockUsers
        .filter(
          (user) =>
            user.name.includes(normalizedSearch) ||
            user.email.includes(normalizedSearch) ||
            sourceLabel[user.source].includes(normalizedSearch),
        )
        .map((user) => ({ type: "user", item: user, depth: 0 }));
      return [...orgTargets, ...groupTargets, ...userTargets];
    }

    const rows: PolicyTarget[] = [];
    const appendChildren = (parentId: string | null, depth: number) => {
      const children = orgUnitsByParent[parentId ?? "__root__"] ?? [];
      for (const org of children) {
        rows.push({ type: "org", item: org, depth });
        if (expandedOrgIds.has(org.id)) {
          appendChildren(org.id, depth + 1);
        }
      }
    };

    appendChildren(null, 0);
    rows.push(
      ...mockGroups.map((group) => ({
        type: "group" as const,
        item: group,
        depth: 0,
      })),
      ...mockUsers.map((user) => ({
        type: "user" as const,
        item: user,
        depth: 0,
      })),
    );
    return rows;
  }, [expandedOrgIds, search]);

  const currentTarget =
    targets.find(
      (target) =>
        target.type === selectedTarget.type &&
        target.item.id === selectedTarget.id,
    ) ??
    targets.find(
      (target) =>
        target.type === initialTargetType && target.item.id === initialTargetId,
    ) ??
    targets[0]!;

  const activeType = currentTarget.type;

  const getEffect = (tool: (typeof mockTools)[number]) => {
    if (activeType === "org") return tool.orgEffect;
    if (activeType === "group") return tool.groupEffect;
    return tool.userEffect;
  };

  const pendingDiffCount = mockTools.filter(
    (tool) => getEffect(tool) !== "unset",
  ).length;
  const reasonValue =
    activeType === "org"
      ? `${currentTarget.item.name} の標準 MCP 権限を監査方針に合わせる`
      : activeType === "group"
        ? `${currentTarget.item.name} に必要な横断例外権限を確認`
        : `${currentTarget.item.name} の一時的な個別例外を確認`;

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
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b-border-default shrink-0 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-text-primary text-lg font-semibold">
              権限管理
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              ディレクトリ上の対象を同じ一覧から選び、種別に応じた権限効果を確認
            </p>
          </div>
          <button
            type="button"
            disabled
            className="bg-btn-primary-bg text-btn-primary-text min-h-[44px] cursor-not-allowed rounded-lg px-4 text-xs font-medium opacity-60"
          >
            モック保存
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="border-r-border-default flex w-[360px] shrink-0 flex-col border-r">
          <div className="border-b-border-default border-b px-4 py-3">
            <div className="relative">
              <Search
                size={12}
                className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="組織・グループ・ユーザーで検索"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-text-subtle px-2 pb-2 text-[10px]">
              階層組織 / 横断グループ / ユーザー例外
            </div>
            {targets.map((target) => {
              const isSelected =
                currentTarget.type === target.type &&
                currentTarget.item.id === target.item.id;
              const isOrg = target.type === "org";
              const hasChildren =
                isOrg && Boolean(childCountByParent[target.item.id]);
              const isExpanded = isOrg && expandedOrgIds.has(target.item.id);
              const Icon =
                target.type === "org"
                  ? Building2
                  : target.type === "group"
                    ? Users
                    : User;
              const paddingClass = isOrg
                ? (depthPaddingClass[target.depth] ?? "pl-3")
                : "pl-3";

              return (
                <div
                  key={`${target.type}:${target.item.id}`}
                  className={`border-border-subtle hover:bg-bg-card-hover mb-1 flex min-h-[56px] w-full items-center gap-1 rounded-lg border py-2 pr-3 text-left transition-colors ${
                    isSelected ? "bg-bg-active" : "bg-transparent"
                  } ${paddingClass}`}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-label={
                        isExpanded
                          ? `${target.item.name} を折りたたむ`
                          : `${target.item.name} を展開`
                      }
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(target.item.id)}
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
                    onClick={() =>
                      setSelectedTarget({
                        type: target.type,
                        id: target.item.id,
                      })
                    }
                    className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <Icon size={14} className="text-text-secondary" />
                    <span className="min-w-0 flex-1">
                      <span className="text-text-primary block truncate text-xs font-medium">
                        {getTargetName(target)}
                      </span>
                      <span className="text-text-muted block truncate text-[10px]">
                        {getTargetSub(target)}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${sourceBadgeClass[getTargetSource(target)]}`}
                    >
                      {target.type === "org"
                        ? "組織"
                        : target.type === "group"
                          ? "グループ"
                          : "例外"}
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
                <span className="bg-bg-active text-text-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]">
                  {activeType === "org" ? (
                    <Building2 size={10} />
                  ) : activeType === "group" ? (
                    <Users size={10} />
                  ) : (
                    <User size={10} />
                  )}
                  {targetLabel[activeType]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${sourceBadgeClass[getTargetSource(currentTarget)]}`}
                >
                  {sourceLabel[getTargetSource(currentTarget)]}
                </span>
              </div>
              <h2 className="text-text-primary text-xl font-semibold">
                {getTargetName(currentTarget)}
              </h2>
              <p className="text-text-secondary mt-1 text-xs">
                {targetDescription[activeType]}
              </p>
            </div>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: activeType === "user" ? User : GitBranch,
                label: "対象種別",
                value: targetLabel[activeType],
                sub:
                  activeType === "org"
                    ? "下位組織へ継承"
                    : activeType === "group"
                      ? "横断例外として適用"
                      : "個人単位で最優先",
              },
              {
                icon: Shield,
                label: "保存前の差分",
                value: `${pendingDiffCount} 件`,
                sub: "変更予定の提供ツール数",
              },
              {
                icon: Check,
                label: "変更理由",
                value: reasonValue,
                sub: "監査ログに残す想定",
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
                <div className="text-text-primary line-clamp-2 text-sm font-semibold">
                  {value}
                </div>
                <div className="text-text-subtle mt-1 text-[10px]">{sub}</div>
              </section>
            ))}
          </div>

          <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
            <div className="border-b-border-default px-5 py-3">
              <h3 className="text-text-primary text-sm font-semibold">
                MCP 権限
              </h3>
              <p className="text-text-muted mt-1 text-[10px]">
                組織標準、横断グループ、ユーザー例外を同じ操作面で確認します。
              </p>
            </div>
            <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_96px_180px_156px] items-center gap-3 border-b px-5 py-3 text-[10px] sm:grid">
              <span>提供ツール</span>
              <span>リスク</span>
              <span>継承元 / 理由</span>
              <span className="text-right">設定</span>
            </div>
            {mockTools.map((tool) => {
              const effect = getEffect(tool);
              return (
                <div
                  key={tool.id}
                  className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-4 text-xs transition-colors sm:grid-cols-[1fr_96px_180px_156px]"
                >
                  <div className="min-w-0">
                    <div className="text-text-primary font-medium">
                      {tool.name}
                    </div>
                    <div className="text-text-muted mt-1 font-mono text-[10px]">
                      {tool.catalog}
                    </div>
                  </div>
                  <span
                    className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${riskClass[tool.risk]}`}
                  >
                    {tool.risk}
                  </span>
                  <div className="hidden min-w-0 sm:block">
                    <div className="text-text-secondary truncate">
                      {tool.inheritedFrom}
                    </div>
                    <div className="text-text-muted mt-1 truncate text-[10px]">
                      {tool.reason}
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
                    {(["allow", "deny", "unset"] as PolicyEffect[]).map(
                      (candidate) => {
                        const cfg = effectConfig[candidate];
                        const Icon = cfg.icon;
                        return (
                          <button
                            key={candidate}
                            type="button"
                            disabled
                            title={cfg.label}
                            className={`flex min-h-[44px] min-w-[44px] cursor-not-allowed items-center justify-center rounded-md ${
                              effect === candidate
                                ? cfg.className
                                : "bg-bg-active text-text-muted opacity-50"
                            }`}
                          >
                            <Icon size={13} />
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
};

const AdminRolesPage = () => (
  <Suspense fallback={null}>
    <AdminRolesContent />
  </Suspense>
);

export default AdminRolesPage;
