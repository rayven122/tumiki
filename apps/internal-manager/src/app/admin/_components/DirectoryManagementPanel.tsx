"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Edit3,
  GitBranch,
  Link2,
  Loader2,
  Lock,
  Plus,
  Search,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api, type RouterOutputs } from "~/trpc/react";

export type DirectoryTab = "organizations" | "groups";

type OrgUnit = RouterOutputs["orgUnits"]["tree"][number];
type Group = RouterOutputs["groups"]["list"][number];
type UserListItem = RouterOutputs["users"]["list"][number];

type DirectoryEntry =
  | { kind: "org"; item: OrgUnit; depth: number }
  | { kind: "group"; item: Group; depth: number };

type SelectedEntry = {
  kind: DirectoryEntry["kind"];
  id: string;
};

type DeleteConfirmState = SelectedEntry & {
  name: string;
};

type EntryFormState =
  | {
      mode: "create";
      kind: "org";
      name: string;
      parentId: string;
    }
  | {
      mode: "edit";
      kind: "org";
      id: string;
      name: string;
      parentId: string;
    }
  | {
      mode: "create";
      kind: "group";
      name: string;
      description: string;
      externalId: string;
    }
  | {
      mode: "edit";
      kind: "group";
      id: string;
      name: string;
      description: string;
      externalId: string;
    };

const depthPaddingClass: Partial<Record<number, string>> = {
  0: "pl-3",
  1: "pl-8",
  2: "pl-14",
  3: "pl-20",
};

const ROOT_ORG_PARENT_KEY = "__root__";

const sourceLabel = {
  SCIM: "SCIM",
  GROUP: "グループ由来",
  MANUAL: "手動",
  IDP: "IdP",
  TUMIKI: "Tumiki",
} as const;

const sourceBadgeClass = {
  SCIM: "bg-sky-500/15 text-sky-300",
  GROUP: "bg-violet-500/15 text-violet-300",
  MANUAL: "bg-emerald-500/15 text-emerald-300",
  IDP: "bg-sky-500/15 text-sky-300",
  TUMIKI: "bg-emerald-500/15 text-emerald-300",
} as const;

const tabLabel = {
  organizations: "組織",
  groups: "グループ",
} as const;

const isOrgEditable = (org: OrgUnit) => org.source === "MANUAL";
const isGroupEditable = (group: Group) => group.source === "TUMIKI";

const getUserLabel = (user: { name?: string | null; email?: string | null }) =>
  user.name ?? user.email ?? "名前未設定";

const getMutationErrorMessage = (error: {
  data?: { code?: string } | null;
  message: string;
}) => {
  if (
    error.data?.code === "BAD_REQUEST" ||
    error.data?.code === "NOT_FOUND" ||
    error.data?.code === "CONFLICT"
  ) {
    return error.message;
  }
  return "操作に失敗しました。時間をおいて再試行してください。";
};

const buildOrgDepthById = (orgUnits: OrgUnit[]) => {
  const byParent = new Map<string, OrgUnit[]>();
  for (const org of orgUnits) {
    const parentKey = org.parentId ?? ROOT_ORG_PARENT_KEY;
    byParent.set(parentKey, [...(byParent.get(parentKey) ?? []), org]);
  }

  const rows: { org: OrgUnit; depth: number }[] = [];
  const visitedIds = new Set<string>();
  const appendChildren = (parentId: string | null, depth: number) => {
    const children = byParent.get(parentId ?? ROOT_ORG_PARENT_KEY) ?? [];
    for (const org of children) {
      if (visitedIds.has(org.id)) continue;
      visitedIds.add(org.id);
      rows.push({ org, depth });
      appendChildren(org.id, depth + 1);
    }
  };
  appendChildren(null, 0);

  return {
    rows,
    depthById: new Map(rows.map(({ org, depth }) => [org.id, depth])),
    byParent,
  };
};

export const DirectoryManagementPanel = ({
  initialTab,
}: {
  initialTab: DirectoryTab;
}) => {
  const utils = api.useUtils();
  const [activeTab, setActiveTab] = useState<DirectoryTab>(initialTab);
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry | null>(
    null,
  );
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [entryForm, setEntryForm] = useState<EntryFormState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(
    null,
  );
  const [memberUserId, setMemberUserId] = useState("");
  const [memberIsPrimary, setMemberIsPrimary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orgUnitsQuery = api.orgUnits.tree.useQuery();
  const groupsQuery = api.groups.list.useQuery();
  const usersQuery = api.users.list.useQuery({
    search: undefined,
    role: "all",
    isActive: "true",
  });

  const orgUnits = orgUnitsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const activeUsers = usersQuery.data ?? [];
  const isLoading =
    orgUnitsQuery.isLoading || groupsQuery.isLoading || usersQuery.isLoading;
  const isError =
    orgUnitsQuery.isError || groupsQuery.isError || usersQuery.isError;

  const orgTree = useMemo(() => buildOrgDepthById(orgUnits), [orgUnits]);
  const childCountByParent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const org of orgUnits) {
      if (!org.parentId) continue;
      counts.set(org.parentId, (counts.get(org.parentId) ?? 0) + 1);
    }
    return counts;
  }, [orgUnits]);
  const invalidateDirectory = useCallback(async () => {
    await Promise.all([
      utils.orgUnits.tree.invalidate(),
      utils.groups.list.invalidate(),
    ]);
  }, [utils.groups.list, utils.orgUnits.tree]);

  const handleMutationError = (error: {
    data?: { code?: string } | null;
    message: string;
  }) => setErrorMessage(getMutationErrorMessage(error));

  const createOrg = api.orgUnits.createManualOrgUnit.useMutation({
    onSuccess: async (org) => {
      setErrorMessage(null);
      setEntryForm(null);
      setSelectedEntry({ kind: "org", id: org.id });
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const updateOrg = api.orgUnits.updateManualOrgUnit.useMutation({
    onSuccess: async (org) => {
      setErrorMessage(null);
      setEntryForm(null);
      setSelectedEntry({ kind: "org", id: org.id });
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const deleteOrg = api.orgUnits.deleteManualOrgUnit.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      setSelectedEntry(null);
      setDeleteConfirm(null);
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const addOrgMember = api.orgUnits.addMember.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      setMemberUserId("");
      setMemberIsPrimary(false);
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const removeOrgMember = api.orgUnits.removeMember.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });

  const createGroup = api.groups.createTumikiGroup.useMutation({
    onSuccess: async (group) => {
      setErrorMessage(null);
      setEntryForm(null);
      setSelectedEntry({ kind: "group", id: group.id });
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const updateGroup = api.groups.updateTumikiGroupWithMapping.useMutation({
    onSuccess: async (group) => {
      setErrorMessage(null);
      setEntryForm(null);
      setSelectedEntry({ kind: "group", id: group.id });
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const deleteGroup = api.groups.deleteTumikiGroup.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      setSelectedEntry(null);
      setDeleteConfirm(null);
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const addGroupMember = api.groups.addMember.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      setMemberUserId("");
      setMemberIsPrimary(false);
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const removeGroupMember = api.groups.removeMember.useMutation({
    onSuccess: async () => {
      setErrorMessage(null);
      await invalidateDirectory();
    },
    onError: handleMutationError,
  });
  const isMutating =
    createOrg.isPending ||
    updateOrg.isPending ||
    deleteOrg.isPending ||
    addOrgMember.isPending ||
    removeOrgMember.isPending ||
    createGroup.isPending ||
    updateGroup.isPending ||
    deleteGroup.isPending ||
    addGroupMember.isPending ||
    removeGroupMember.isPending;

  useEffect(() => {
    if (selectedEntry) {
      const exists =
        selectedEntry.kind === "org"
          ? orgUnits.some((org) => org.id === selectedEntry.id)
          : groups.some((group) => group.id === selectedEntry.id);
      if (exists) return;
    }

    if (activeTab === "organizations") {
      const first = orgUnits[0];
      setSelectedEntry(first ? { kind: "org", id: first.id } : null);
      return;
    }
    const first = groups[0];
    setSelectedEntry(first ? { kind: "group", id: first.id } : null);
  }, [activeTab, groups, orgUnits, selectedEntry]);

  const selectedItem = selectedEntry
    ? selectedEntry.kind === "org"
      ? (orgUnits.find((org) => org.id === selectedEntry.id) ?? null)
      : (groups.find((group) => group.id === selectedEntry.id) ?? null)
    : null;
  const selectedKind = selectedEntry?.kind ?? null;
  const readonly =
    selectedKind === "org" && selectedItem
      ? !isOrgEditable(selectedItem as OrgUnit)
      : selectedKind === "group" && selectedItem
        ? !isGroupEditable(selectedItem as Group)
        : true;

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      if (activeTab === "organizations") {
        return orgUnits
          .filter((org) =>
            [org.name, org.path, org.source]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch),
          )
          .map((org) => ({
            kind: "org" as const,
            item: org,
            depth: orgTree.depthById.get(org.id) ?? 0,
          }));
      }

      return groups
        .filter((group) =>
          [
            group.name,
            group.description ?? "",
            group.source,
            group.provider ?? "",
            group.externalId ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        )
        .map((group) => ({
          kind: "group" as const,
          item: group,
          depth: 0,
        }));
    }

    if (activeTab === "groups") {
      return groups.map((group) => ({
        kind: "group" as const,
        item: group,
        depth: 0,
      }));
    }

    const rows: DirectoryEntry[] = [];
    const appendChildren = (parentId: string | null, depth: number) => {
      const children =
        orgTree.byParent.get(parentId ?? ROOT_ORG_PARENT_KEY) ?? [];
      for (const org of children) {
        rows.push({ kind: "org", item: org, depth });
        if (expandedOrgIds.has(org.id)) {
          appendChildren(org.id, depth + 1);
        }
      }
    };
    appendChildren(null, 0);
    return rows;
  }, [
    activeTab,
    expandedOrgIds,
    groups,
    orgTree.byParent,
    orgTree.depthById,
    orgUnits,
    search,
  ]);

  const memberRows =
    selectedKind === "org" && selectedItem
      ? (selectedItem as OrgUnit).memberships.map((membership) => ({
          id: membership.id,
          userId: membership.user.id,
          name: getUserLabel(membership.user),
          email: membership.user.email ?? "—",
          // 現スキーマではOrgUnitメンバーシップ自体にsourceが存在しないため、親OrgUnitのsourceを使用する。
          source: (selectedItem as OrgUnit).source,
          readonly,
          isPrimary: membership.isPrimary,
        }))
      : selectedKind === "group" && selectedItem
        ? (selectedItem as Group).memberships.map((membership) => ({
            id: membership.id,
            userId: membership.userId,
            name: getUserLabel(membership.user),
            email: membership.user.email ?? "—",
            source: membership.source,
            readonly:
              readonly ||
              membership.source !== "TUMIKI" ||
              (selectedItem as Group).source !== "TUMIKI",
            isPrimary: false,
          }))
        : [];

  const existingMemberUserIds = new Set(memberRows.map((row) => row.userId));
  const selectableUsers = activeUsers.filter(
    (user) => !existingMemberUserIds.has(user.id),
  );

  const openCreateForm = () => {
    setErrorMessage(null);
    if (activeTab === "organizations") {
      setEntryForm({
        mode: "create",
        kind: "org",
        name: "",
        parentId: selectedKind === "org" ? (selectedEntry?.id ?? "") : "",
      });
      return;
    }
    setEntryForm({
      mode: "create",
      kind: "group",
      name: "",
      description: "",
      externalId: "",
    });
  };

  const openEditForm = () => {
    if (!selectedItem) return;
    setErrorMessage(null);
    if (selectedKind === "org") {
      const org = selectedItem as OrgUnit;
      setEntryForm({
        mode: "edit",
        kind: "org",
        id: org.id,
        name: org.name,
        parentId: org.parentId ?? "",
      });
      return;
    }
    if (selectedKind === "group") {
      const group = selectedItem as Group;
      setEntryForm({
        mode: "edit",
        kind: "group",
        id: group.id,
        name: group.name,
        description: group.description ?? "",
        externalId: group.externalId ?? "",
      });
    }
  };

  const submitEntryForm = () => {
    if (!entryForm || isMutating) return;
    if (entryForm.kind === "org") {
      if (entryForm.mode === "create") {
        createOrg.mutate({
          name: entryForm.name,
          parentId: entryForm.parentId || null,
        });
        return;
      }
      updateOrg.mutate({
        orgUnitId: entryForm.id,
        name: entryForm.name,
        parentId: entryForm.parentId || null,
      });
      return;
    }

    if (entryForm.mode === "create") {
      createGroup.mutate({
        name: entryForm.name,
        description: entryForm.description,
      });
      return;
    }

    updateGroup.mutate({
      groupId: entryForm.id,
      name: entryForm.name,
      description: entryForm.description,
      externalId: entryForm.externalId || null,
    });
  };

  const handleDelete = () => {
    if (!selectedItem || readonly || isMutating) return;
    setDeleteConfirm({
      kind: selectedKind ?? "org",
      id: selectedItem.id,
      name: selectedItem.name,
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirm || isMutating) return;
    if (deleteConfirm.kind === "org") {
      deleteOrg.mutate({ orgUnitId: deleteConfirm.id });
      return;
    }
    if (deleteConfirm.kind === "group") {
      deleteGroup.mutate({ groupId: deleteConfirm.id });
    }
  };

  const handleAddMember = () => {
    if (!selectedItem || readonly || !memberUserId || isMutating) return;
    if (selectedKind === "org") {
      addOrgMember.mutate({
        orgUnitId: selectedItem.id,
        userId: memberUserId,
        isPrimary: memberIsPrimary,
      });
      return;
    }
    if (selectedKind === "group") {
      addGroupMember.mutate({
        groupId: selectedItem.id,
        userId: memberUserId,
      });
    }
  };

  const handleRemoveMember = (membershipId: string) => {
    if (readonly || isMutating) return;
    if (selectedKind === "org") {
      removeOrgMember.mutate({ membershipId });
      return;
    }
    if (selectedKind === "group") {
      removeGroupMember.mutate({ membershipId });
    }
  };

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

  const switchTab = (tab: DirectoryTab) => {
    setActiveTab(tab);
    setSearch("");
    setErrorMessage(null);
    const next =
      tab === "organizations"
        ? orgUnits[0]
          ? ({ kind: "org", id: orgUnits[0].id } as const)
          : null
        : groups[0]
          ? ({ kind: "group", id: groups[0].id } as const)
          : null;
    setSelectedEntry(next);
  };

  const parentOptions = orgTree.rows.filter(
    ({ org }) =>
      org.source === "MANUAL" &&
      (entryForm?.kind !== "org" ||
        entryForm.mode === "create" ||
        org.id !== entryForm.id),
  );

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b-border-default shrink-0 border-b px-6 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-text-primary text-lg font-semibold">
              ディレクトリ管理
            </h1>
            <p className="text-text-secondary mt-1 text-xs">
              SCIM/IdP 由来は readonly、Tumiki
              で作成した組織・グループだけ編集可能
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateForm}
            disabled={isLoading || isMutating}
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={13} />
            {activeTab === "organizations" ? "組織作成" : "グループ作成"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="border-r-border-default flex w-full shrink-0 flex-col border-r md:w-[360px]">
          <div className="border-b-border-default border-b px-4 py-3">
            <div
              className="bg-bg-active mb-3 grid grid-cols-2 rounded-lg p-1"
              role="tablist"
              aria-label="ディレクトリ種別"
            >
              {(["organizations", "groups"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => switchTab(tab)}
                  className={`min-h-[36px] rounded-md text-xs transition-colors ${
                    activeTab === tab
                      ? "bg-bg-card text-text-primary font-medium"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {tabLabel[tab]}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search
                size={12}
                className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
              />
              <input
                type="text"
                aria-label="ディレクトリ検索"
                placeholder={
                  activeTab === "organizations"
                    ? "組織名・path・sourceで検索"
                    : "グループ名・説明・sourceで検索"
                }
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="text-text-muted flex items-center justify-center gap-2 py-10 text-xs">
                <Loader2 size={14} className="animate-spin" />
                読み込み中
              </div>
            ) : isError ? (
              <div className="text-text-muted px-3 py-10 text-center text-xs">
                ディレクトリを取得できませんでした
              </div>
            ) : visibleEntries.length === 0 ? (
              <div className="text-text-muted px-3 py-10 text-center text-xs">
                表示できる{tabLabel[activeTab]}がありません
              </div>
            ) : (
              visibleEntries.map((entry) => {
                const isOrg = entry.kind === "org";
                const item = entry.item;
                const isSelected =
                  selectedEntry?.kind === entry.kind &&
                  selectedEntry?.id === item.id;
                const hasChildren =
                  isOrg && Boolean(childCountByParent.get(item.id));
                const isExpanded = isOrg && expandedOrgIds.has(item.id);
                const count = isOrg
                  ? (item as OrgUnit).memberships.length
                  : (item as Group).memberships.length;
                const summary = isOrg
                  ? (item as OrgUnit).path
                  : ((item as Group).description ?? "説明なし");

                return (
                  <div
                    key={`${entry.kind}:${item.id}`}
                    className={`border-border-subtle hover:bg-bg-card-hover mb-1 flex min-h-[56px] w-full items-center gap-1 rounded-lg border py-2 pr-3 text-left transition-colors ${
                      isSelected ? "bg-bg-active" : "bg-transparent"
                    } ${
                      isOrg
                        ? (depthPaddingClass[entry.depth] ?? "pl-20")
                        : "pl-3"
                    }`}
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
                        className="text-text-muted hover:text-text-primary flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md"
                      >
                        {isExpanded ? (
                          <ChevronDown size={13} />
                        ) : (
                          <ChevronRight size={13} />
                        )}
                      </button>
                    ) : (
                      <span className="min-w-[44px]" />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedEntry({ kind: entry.kind, id: item.id })
                      }
                      className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
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
                        className={`rounded-full px-2 py-0.5 text-[9px] ${
                          sourceBadgeClass[item.source]
                        }`}
                      >
                        {sourceLabel[item.source]}
                      </span>
                      <span className="text-text-subtle text-[10px]">
                        {count}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          {errorMessage ? (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {errorMessage}
            </div>
          ) : null}

          {!selectedItem ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <p className="text-text-muted text-xs">
                左の一覧から{tabLabel[activeTab]}を選択してください
              </p>
            </div>
          ) : (
            <>
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
                      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
                        sourceBadgeClass[selectedItem.source]
                      }`}
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
                      ? (selectedItem as OrgUnit).path
                      : ((selectedItem as Group).description ?? "説明なし")}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={openEditForm}
                    disabled={readonly || isMutating}
                    title={
                      readonly
                        ? "SCIM/IdP由来のデータは管理画面から編集できません"
                        : undefined
                    }
                    className="bg-bg-active text-text-secondary flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Edit3 size={12} />
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={readonly || isMutating}
                    className="bg-bg-active flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={12} />
                    削除
                  </button>
                  <Link
                    href={`/admin/roles?targetType=${
                      selectedKind === "org" ? "org" : "group"
                    }&targetId=${selectedItem.id}`}
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
                    icon: selectedKind === "org" ? GitBranch : Link2,
                    label: selectedKind === "org" ? "path" : "外部識別子",
                    value:
                      selectedKind === "org"
                        ? (selectedItem as OrgUnit).path
                        : ((selectedItem as Group).externalId ??
                          "Tumiki manual group"),
                  },
                  {
                    icon: Shield,
                    label: "権限設定",
                    value:
                      selectedKind === "org"
                        ? `${(selectedItem as OrgUnit).permissions.length} 件`
                        : "権限管理画面で設定",
                  },
                  {
                    icon: Users,
                    label: "対象ユーザー",
                    value: `${memberRows.length} 名`,
                  },
                ].map(({ icon: Icon, label, value }) => (
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
                  </section>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
                <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                  <div className="border-b-border-default flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
                    <h3 className="text-text-primary text-sm font-semibold">
                      メンバー
                    </h3>
                    <div className="flex min-w-0 flex-1 justify-end gap-2">
                      <select
                        value={memberUserId}
                        onChange={(event) =>
                          setMemberUserId(event.target.value)
                        }
                        disabled={readonly || isMutating}
                        className="bg-bg-active border-border-default text-text-secondary min-h-[44px] min-w-0 rounded-lg border px-3 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <option value="">追加するユーザーを選択</option>
                        {selectableUsers.map((user: UserListItem) => (
                          <option key={user.id} value={user.id}>
                            {getUserLabel(user)} ({user.email ?? "no email"})
                          </option>
                        ))}
                      </select>
                      {selectedKind === "org" ? (
                        <label className="bg-bg-active border-border-default text-text-secondary flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 text-xs">
                          <input
                            type="checkbox"
                            checked={memberIsPrimary}
                            onChange={(event) =>
                              setMemberIsPrimary(event.target.checked)
                            }
                            disabled={readonly || isMutating}
                            className="h-3.5 w-3.5"
                          />
                          主所属
                        </label>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleAddMember}
                        disabled={readonly || !memberUserId || isMutating}
                        className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserPlus size={12} />
                        追加
                      </button>
                    </div>
                  </div>
                  {memberRows.length === 0 ? (
                    <div className="text-text-muted px-5 py-8 text-center text-xs">
                      直接所属しているユーザーはいません
                    </div>
                  ) : (
                    memberRows.map((member) => (
                      <div
                        key={member.id}
                        className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-3 text-xs transition-colors sm:grid-cols-[1fr_150px_96px]"
                      >
                        <Link
                          href={`/admin/users/${member.userId}`}
                          className="min-w-0"
                        >
                          <div className="text-text-primary font-medium">
                            {member.name}
                          </div>
                          <div className="text-text-muted truncate text-[10px]">
                            {member.email}
                          </div>
                        </Link>
                        <span
                          className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${
                            sourceBadgeClass[member.source]
                          }`}
                        >
                          {member.isPrimary
                            ? `${sourceLabel[member.source]} / primary`
                            : sourceLabel[member.source]}
                        </span>
                        <button
                          type="button"
                          aria-label={`${member.name} をメンバーから削除`}
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={member.readonly || isMutating}
                          className="text-text-muted flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <UserMinus size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </section>

                <section className="bg-bg-card border-border-default rounded-xl border p-4">
                  <h3 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Link2 size={14} />
                    同期と編集境界
                  </h3>
                  <div className="space-y-2">
                    <div className="bg-bg-active rounded-lg px-3 py-3">
                      <div className="text-text-muted text-[10px]">source</div>
                      <div className="text-text-primary mt-1 text-xs">
                        {sourceLabel[selectedItem.source]}
                      </div>
                    </div>
                    {selectedKind === "group" ? (
                      <div className="bg-bg-active rounded-lg px-3 py-3">
                        <div className="text-text-muted text-[10px]">
                          provider / externalId
                        </div>
                        <div className="text-text-primary mt-1 font-mono text-xs">
                          {(selectedItem as Group).provider ?? "—"} /{" "}
                          {(selectedItem as Group).externalId ?? "—"}
                        </div>
                      </div>
                    ) : null}
                    <p className="text-text-muted text-[10px]">
                      SCIM/IdP 由来のデータは同期元を truth
                      とし、ここでは参照のみです。 手動作成した組織・Tumiki
                      グループだけ編集できます。
                    </p>
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>

      {entryForm ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setEntryForm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="directory-entry-form-title"
            className="bg-bg-card border-border-default w-full max-w-md rounded-2xl border shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b-border-default flex items-start justify-between gap-3 border-b px-4 py-3">
              <div>
                <h2
                  id="directory-entry-form-title"
                  className="text-text-primary text-sm font-semibold"
                >
                  {entryForm.mode === "create" ? "作成" : "編集"}
                </h2>
                <p className="text-text-muted mt-0.5 text-[11px]">
                  {entryForm.kind === "org"
                    ? "手動管理する組織を設定"
                    : "Tumiki グループを設定"}
                </p>
              </div>
              <button
                type="button"
                aria-label="閉じる"
                onClick={() => setEntryForm(null)}
                className="text-text-muted hover:text-text-primary flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md"
              >
                <X size={14} />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <label className="block">
                <span className="text-text-secondary text-[11px]">名前</span>
                <input
                  value={entryForm.name}
                  onChange={(event) =>
                    setEntryForm({ ...entryForm, name: event.target.value })
                  }
                  maxLength={100}
                  className="bg-bg-active border-border-default text-text-primary mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none"
                />
              </label>
              {entryForm.kind === "org" ? (
                <label className="block">
                  <span className="text-text-secondary text-[11px]">
                    親組織
                  </span>
                  <select
                    value={entryForm.parentId}
                    onChange={(event) =>
                      setEntryForm({
                        ...entryForm,
                        parentId: event.target.value,
                      })
                    }
                    className="bg-bg-active border-border-default text-text-primary mt-1 w-full rounded-lg border px-3 py-2 text-xs outline-none"
                  >
                    <option value="">トップレベル</option>
                    {parentOptions.map(({ org, depth }) => (
                      <option key={org.id} value={org.id}>
                        {"　".repeat(Math.min(depth, 4))}
                        {org.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="text-text-secondary text-[11px]">
                      説明
                    </span>
                    <textarea
                      value={entryForm.description}
                      onChange={(event) =>
                        setEntryForm({
                          ...entryForm,
                          description: event.target.value,
                        })
                      }
                      maxLength={500}
                      className="bg-bg-active border-border-default text-text-primary mt-1 min-h-[88px] w-full rounded-lg border px-3 py-2 text-xs outline-none"
                    />
                  </label>
                  {entryForm.mode === "edit" ? (
                    <label className="block">
                      <span className="text-text-secondary text-[11px]">
                        IdP mapping externalId
                      </span>
                      <input
                        value={entryForm.externalId}
                        onChange={(event) =>
                          setEntryForm({
                            ...entryForm,
                            externalId: event.target.value,
                          })
                        }
                        maxLength={200}
                        className="bg-bg-active border-border-default text-text-primary mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs outline-none"
                      />
                    </label>
                  ) : null}
                </>
              )}
            </div>
            <div className="border-t-border-default bg-bg-app flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                onClick={() => setEntryForm(null)}
                className="bg-bg-active text-text-secondary min-h-[44px] rounded-lg px-3 text-xs"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={submitEntryForm}
                disabled={isMutating || entryForm.name.trim().length === 0}
                className="bg-btn-primary-bg text-btn-primary-text inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMutating ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : null}
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteConfirm ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="directory-delete-title"
            className="bg-bg-card border-border-default w-full max-w-sm rounded-2xl border shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b-border-default border-b px-4 py-3">
              <h2
                id="directory-delete-title"
                className="text-text-primary text-sm font-semibold"
              >
                削除しますか？
              </h2>
              <p className="text-text-muted mt-1 text-[11px]">
                {deleteConfirm.name} を削除します。この操作は取り消せません。
              </p>
            </div>
            <div className="bg-bg-app flex justify-end gap-2 rounded-b-2xl px-4 py-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="bg-bg-active text-text-secondary min-h-[44px] rounded-lg px-3 text-xs"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isMutating}
                className="min-h-[44px] rounded-lg bg-red-500/15 px-3 text-xs font-medium text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
