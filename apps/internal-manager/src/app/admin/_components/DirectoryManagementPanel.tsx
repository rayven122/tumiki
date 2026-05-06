"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  GitBranch,
  Layers3,
  Link2,
  Lock,
  Plus,
  Search,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import {
  effectBadgeClass,
  getUserById,
  mockGroups,
  mockOrgUnits,
  sourceBadgeClass,
  sourceLabel,
  type MockGroup,
  type MockOrgUnit,
  type MockUser,
} from "./idp-ui-mock-data";

export type DirectoryTab = "organizations" | "groups";

type DirectoryEntry =
  | { kind: "org"; item: MockOrgUnit; depth: number }
  | { kind: "group"; item: MockGroup; depth: number };

type SelectedEntry = {
  kind: DirectoryEntry["kind"];
  id: string;
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

const syncLabel = {
  synced: "同期済み",
  manual: "手動",
  pending: "未同期",
} as const;

const policyValueEffect = {
  許可: "allow",
  拒否: "deny",
  未設定: "unset",
} as const;

const toPolicyEffect = (value: MockOrgUnit["policies"][number]["value"]) =>
  policyValueEffect[value];

const getInitialSelection = (initialTab: DirectoryTab): SelectedEntry =>
  initialTab === "groups"
    ? { kind: "group", id: "ai-program" }
    : { kind: "org", id: "platform" };

export const DirectoryManagementPanel = ({
  initialTab,
}: {
  initialTab: DirectoryTab;
}) => {
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry>(() =>
    getInitialSelection(initialTab),
  );
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    () => new Set(["root", "engineering"]),
  );

  const selectedOrg =
    selectedEntry.kind === "org"
      ? mockOrgUnits.find((org) => org.id === selectedEntry.id)
      : null;
  const selectedGroup =
    selectedEntry.kind === "group"
      ? mockGroups.find((group) => group.id === selectedEntry.id)
      : null;
  const selectedItem = selectedOrg ?? selectedGroup ?? mockOrgUnits[0]!;
  const selectedKind = selectedOrg ? "org" : "group";
  const readonly = selectedItem.readonly;
  const memberIds =
    selectedKind === "org"
      ? (selectedItem as MockOrgUnit).userIds
      : (selectedItem as MockGroup).memberIds;
  const members = useMemo(
    () =>
      memberIds
        .map(getUserById)
        .filter((user): user is MockUser => Boolean(user)),
    [memberIds],
  );

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      const orgEntries: DirectoryEntry[] = mockOrgUnits
        .filter(
          (org) =>
            org.name.includes(normalizedSearch) ||
            org.path.includes(normalizedSearch) ||
            sourceLabel[org.source].includes(normalizedSearch),
        )
        .map((org) => ({ kind: "org", item: org, depth: 0 }));
      const groupEntries: DirectoryEntry[] = mockGroups
        .filter(
          (group) =>
            group.name.includes(normalizedSearch) ||
            group.description.includes(normalizedSearch) ||
            sourceLabel[group.source].includes(normalizedSearch),
        )
        .map((group) => ({ kind: "group", item: group, depth: 0 }));
      return [...orgEntries, ...groupEntries];
    }

    const rows: DirectoryEntry[] = [];
    const appendChildren = (parentId: string | null, depth: number) => {
      const children = orgUnitsByParent[parentId ?? "__root__"] ?? [];
      for (const org of children) {
        rows.push({ kind: "org", item: org, depth });
        if (expandedOrgIds.has(org.id)) {
          appendChildren(org.id, depth + 1);
        }
      }
    };

    appendChildren(null, 0);
    rows.push(
      ...mockGroups.map((group) => ({
        kind: "group" as const,
        item: group,
        depth: 0,
      })),
    );
    return rows;
  }, [expandedOrgIds, search]);

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
              ディレクトリ管理
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              組織階層と横断グループを同じ一覧で扱い、種別だけを裏側で分離
            </p>
          </div>
          <button
            type="button"
            disabled
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-3 text-xs font-medium opacity-60"
          >
            <Plus size={13} />
            エントリ作成
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="border-r-border-default flex w-full shrink-0 flex-col border-r md:w-[360px]">
          <div className="border-b-border-default border-b px-4 py-3">
            <div className="relative">
              <Search
                size={12}
                className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="組織・グループ・sourceで検索"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-text-subtle px-2 pb-2 text-[10px]">
              階層組織 / 横断グループ
            </div>
            {visibleEntries.map((entry) => {
              const isOrg = entry.kind === "org";
              const item = entry.item;
              const isSelected =
                selectedEntry.kind === entry.kind &&
                selectedEntry.id === item.id;
              const hasChildren =
                isOrg && Boolean(childCountByParent[(item as MockOrgUnit).id]);
              const isExpanded = isOrg && expandedOrgIds.has(item.id);
              const source = item.source;
              const summary = isOrg
                ? (item as MockOrgUnit).path
                : (item as MockGroup).description;
              const count = isOrg
                ? (item as MockOrgUnit).userIds.length
                : (item as MockGroup).memberIds.length;

              return (
                <div
                  key={`${entry.kind}:${item.id}`}
                  className={`border-border-subtle hover:bg-bg-card-hover mb-1 flex min-h-[56px] w-full items-center gap-1 rounded-lg border py-2 pr-3 text-left transition-colors ${
                    isSelected ? "bg-bg-active" : "bg-transparent"
                  } ${isOrg ? (depthPaddingClass[entry.depth] ?? "pl-3") : "pl-3"}`}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      aria-label={
                        isExpanded
                          ? `${item.name} を折りたたむ`
                          : `${item.name} を展開`
                      }
                      aria-expanded={isExpanded}
                      onClick={() => toggleExpanded(item.id)}
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
                      setSelectedEntry({ kind: entry.kind, id: item.id })
                    }
                    className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {isOrg ? (
                      <Building2 size={14} className="text-text-secondary" />
                    ) : (
                      <Users size={14} className="text-text-secondary" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="text-text-primary block truncate text-xs font-medium">
                        {item.name}
                      </span>
                      <span className="text-text-muted block truncate text-[10px]">
                        {summary}
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] ${sourceBadgeClass[source]}`}
                    >
                      {isOrg ? "組織" : "グループ"}
                    </span>
                    <span className="text-text-subtle text-[10px]">
                      {count}
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
                  {selectedKind === "org" ? (
                    <Building2 size={10} />
                  ) : (
                    <Users size={10} />
                  )}
                  {selectedKind === "org" ? "階層組織" : "横断グループ"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${sourceBadgeClass[selectedItem.source]}`}
                >
                  {sourceLabel[selectedItem.source]}
                </span>
                {readonly ? (
                  <span className="bg-bg-active text-text-muted inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px]">
                    <Lock size={10} />
                    readonly
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] text-emerald-300">
                    編集可能
                  </span>
                )}
              </div>
              <h2 className="text-text-primary text-xl font-semibold">
                {selectedItem.name}
              </h2>
              <p className="text-text-secondary mt-1 text-xs">
                {selectedKind === "org"
                  ? (selectedItem as MockOrgUnit).path
                  : (selectedItem as MockGroup).description}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={readonly}
                className="bg-bg-active text-text-secondary min-h-[44px] rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                編集
              </button>
              <Link
                href={`/admin/roles?targetType=${selectedKind}&targetId=${selectedItem.id}`}
                className="bg-btn-primary-bg text-btn-primary-text inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-medium"
              >
                <Shield size={13} />
                権限管理へ
              </Link>
            </div>
          </div>

          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: selectedKind === "org" ? GitBranch : Layers3,
                label: selectedKind === "org" ? "管理スコープ" : "扱い",
                value:
                  selectedKind === "org"
                    ? (selectedItem as MockOrgUnit).adminScope
                    : "横断メンバーシップ",
                sub:
                  selectedKind === "org"
                    ? "階層継承の基点"
                    : "組織階層をまたぐ例外集合",
              },
              {
                icon: Shield,
                label: selectedKind === "org" ? "担当管理者" : "権限割当",
                value:
                  selectedKind === "org"
                    ? (selectedItem as MockOrgUnit).delegatedAdmin
                    : `${(selectedItem as MockGroup).assignedPolicies.length} 件`,
                sub:
                  selectedKind === "org"
                    ? "この範囲を管理する権限"
                    : "グループ単位の例外権限",
              },
              {
                icon: Users,
                label: "対象ユーザー",
                value: `${members.length} 名`,
                sub:
                  selectedKind === "org"
                    ? ((selectedItem as MockOrgUnit).inheritedFrom ??
                      "トップレベル")
                    : syncLabel[(selectedItem as MockGroup).syncState],
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
                <div className="text-text-primary text-sm font-semibold">
                  {value}
                </div>
                <div className="text-text-subtle mt-1 text-[10px]">{sub}</div>
              </section>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
              <div className="border-b-border-default flex items-center justify-between border-b px-5 py-3">
                <h3 className="text-text-primary text-sm font-semibold">
                  メンバー
                </h3>
                <button
                  type="button"
                  disabled={readonly}
                  className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={12} />
                  追加
                </button>
              </div>
              {members.length === 0 ? (
                <div className="text-text-muted px-5 py-8 text-center text-xs">
                  直接所属しているユーザーはいません
                </div>
              ) : (
                members.map((user) => (
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
                <h3 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Link2 size={14} />
                  {selectedKind === "org" ? "階層と継承" : "同期と source"}
                </h3>
                {selectedKind === "org" ? (
                  <div className="space-y-2">
                    <div className="bg-bg-active rounded-lg px-3 py-3">
                      <div className="text-text-muted text-[10px]">親組織</div>
                      <div className="text-text-primary mt-1 text-xs">
                        {(selectedItem as MockOrgUnit).inheritedFrom ??
                          "トップレベル"}
                      </div>
                    </div>
                    <p className="text-text-muted text-[10px]">
                      下位組織は上位の MCP
                      権限を継承し、必要な範囲だけ例外を持ちます。
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-bg-active rounded-lg px-3 py-3">
                      <div className="text-text-muted text-[10px]">
                        外部識別子
                      </div>
                      <div className="text-text-primary mt-1 font-mono text-xs">
                        {(selectedItem as MockGroup).externalId ??
                          "Tumiki manual group"}
                      </div>
                    </div>
                    <p className="text-text-muted text-[10px]">
                      外部 IdP 由来の membership は readonly。Tumiki
                      独自グループだけ手動編集できます。
                    </p>
                  </div>
                )}
              </section>

              <section className="bg-bg-card border-border-default rounded-xl border p-4">
                <h3 className="text-text-primary mb-3 text-sm font-semibold">
                  MCP 権限
                </h3>
                <div className="space-y-2">
                  {selectedKind === "org"
                    ? (selectedItem as MockOrgUnit).policies.map((policy) => (
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
                      ))
                    : (selectedItem as MockGroup).assignedPolicies.map(
                        (policy) => (
                          <div
                            key={policy}
                            className="bg-bg-active flex items-center justify-between gap-3 rounded-lg px-3 py-2"
                          >
                            <span className="text-text-secondary text-xs">
                              {policy}
                            </span>
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                              許可
                            </span>
                          </div>
                        ),
                      )}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
