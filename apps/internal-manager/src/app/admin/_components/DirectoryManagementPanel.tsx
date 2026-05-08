"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
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
import {
  getEffectBadgeClass,
  getEffectLabel,
  getRiskLabel,
  getUserLabel,
  sourceBadgeClass,
  sourceKindLabel,
} from "./permission-display-utils";

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
    }
  | {
      mode: "edit";
      kind: "group";
      id: string;
      name: string;
      description: string;
    };

const depthPaddingClass: Partial<Record<number, string>> = {
  0: "pl-3",
  1: "pl-8",
  2: "pl-14",
  3: "pl-20",
  4: "pl-24",
  5: "pl-28",
  6: "pl-32",
};

const ROOT_ORG_PARENT_KEY = "__root__";
const GROUP_DISPLAY_LIMIT = 200;
const tabLabel = {
  organizations: "組織",
  groups: "グループ",
} as const;

const isOrgEditable = (org: OrgUnit) => org.source === "MANUAL";
const isGroupEditable = (group: Group) => group.source === "TUMIKI";

const directorySourceLabel = {
  SCIM: "外部IdP連携",
  IDP: "外部IdP連携",
  MANUAL: "手動作成",
  TUMIKI: "手動作成",
  GROUP: "グループ連携",
} as const;

const getEditDisabledTooltip = (kind: SelectedEntry["kind"] | null) =>
  kind === "group"
    ? "外部IdP連携グループの名前と説明は連携元で管理されています"
    : "外部IdP連携の組織は連携元で管理されています";

const getDeleteDisabledTooltip = (kind: SelectedEntry["kind"] | null) =>
  kind === "group"
    ? "外部IdP連携グループは削除できません"
    : "外部IdP連携の組織は削除できません";

const getMemberRemoveDisabledTooltip = (kind: SelectedEntry["kind"] | null) =>
  kind === "group"
    ? "外部IdPから同期されたメンバーは連携元で管理されています"
    : "外部IdP連携の組織メンバーは連携元で管理されています";

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
  const [selectedMemberUserIds, setSelectedMemberUserIds] = useState<
    Set<string>
  >(() => new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [memberIsPrimary, setMemberIsPrimary] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const orgUnitsQuery = api.orgUnits.tree.useQuery();
  const groupsQuery = api.groups.list.useQuery();

  const orgUnits = orgUnitsQuery.data ?? [];
  const rawGroups = groupsQuery.data ?? [];
  const hasMoreGroups = rawGroups.length > GROUP_DISPLAY_LIMIT;
  const groups = hasMoreGroups
    ? rawGroups.slice(0, GROUP_DISPLAY_LIMIT)
    : rawGroups;
  const isLoading = orgUnitsQuery.isLoading || groupsQuery.isLoading;
  const isError = orgUnitsQuery.isError || groupsQuery.isError;

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
      utils.orgUnits.listUsers.invalidate(),
      utils.groups.list.invalidate(),
      utils.users.list.invalidate(),
      utils.mcpPolicies.getTargetPermissionSummary.invalidate(),
    ]);
  }, [
    utils.groups.list,
    utils.mcpPolicies.getTargetPermissionSummary,
    utils.orgUnits.listUsers,
    utils.orgUnits.tree,
    utils.users.list,
  ]);
  const clearMemberSelection = useCallback(() => {
    setSelectedMemberUserIds(new Set());
    setMemberSearch("");
    setMemberIsPrimary(false);
  }, []);

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
      clearMemberSelection();
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
  const updateGroup = api.groups.updateTumikiGroup.useMutation({
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
      clearMemberSelection();
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
    setSelectedEntry((currentEntry) => {
      const expectedKind = activeTab === "organizations" ? "org" : "group";
      if (currentEntry?.kind === expectedKind) {
        const exists =
          currentEntry.kind === "org"
            ? orgUnits.some((org) => org.id === currentEntry.id)
            : groups.some((group) => group.id === currentEntry.id);
        if (exists) return currentEntry;
      }

      if (activeTab === "organizations") {
        const first = orgUnits[0];
        return first ? { kind: "org", id: first.id } : null;
      }
      const first = groups[0];
      return first ? { kind: "group", id: first.id } : null;
    });
  }, [activeTab, groups, orgUnits]);

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
  const selectedOrgUnitId =
    selectedKind === "org" && selectedItem ? selectedItem.id : null;
  const canAddMember = Boolean(
    selectedItem && (selectedKind === "group" || !readonly),
  );
  const orgMembersQuery = api.orgUnits.listUsers.useQuery(
    { orgUnitId: selectedOrgUnitId ?? "__none__" },
    { enabled: Boolean(selectedOrgUnitId) },
  );
  const usersQuery = api.users.list.useQuery(
    {
      search: undefined,
      role: "all",
      isActive: "true",
    },
    { enabled: canAddMember },
  );
  const activeUsers = usersQuery.data ?? [];
  const permissionSummaryQuery =
    api.mcpPolicies.getTargetPermissionSummary.useQuery(
      {
        targetType: selectedKind === "org" ? "org" : "group",
        targetId: selectedItem?.id ?? "__none__",
      },
      { enabled: Boolean(selectedItem && selectedKind) },
    );
  const permissionSummary = permissionSummaryQuery.data;

  const visibleEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (normalizedSearch) {
      if (activeTab === "organizations") {
        return orgUnits
          .filter((org) => org.name.toLowerCase().includes(normalizedSearch))
          .map((org) => ({
            kind: "org" as const,
            item: org,
            depth: orgTree.depthById.get(org.id) ?? 0,
          }));
      }

      return groups
        .filter((group) =>
          [group.name, group.description ?? ""]
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

  const memberRows = useMemo(
    () =>
      selectedKind === "org" && selectedItem
        ? (orgMembersQuery.data ?? []).map((membership) => ({
            id: membership.id,
            userId: membership.user.id,
            name: getUserLabel(membership.user),
            email: membership.user.email ?? "—",
            image: membership.user.image,
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
              image: membership.user.image,
              source: membership.source,
              readonly: membership.source !== "TUMIKI",
              isPrimary: false,
            }))
          : [],
    [orgMembersQuery.data, readonly, selectedItem, selectedKind],
  );

  const selectableUsers = useMemo(() => {
    const existingMemberUserIds = new Set(memberRows.map((row) => row.userId));
    return activeUsers.filter((user) => !existingMemberUserIds.has(user.id));
  }, [activeUsers, memberRows]);
  const visibleSelectableUsers = useMemo(() => {
    const normalizedSearch = memberSearch.trim().toLowerCase();
    if (!normalizedSearch) return selectableUsers;
    return selectableUsers.filter((user) =>
      [getUserLabel(user), user.email ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [memberSearch, selectableUsers]);
  const selectedMemberCount = selectedMemberUserIds.size;

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!entryForm && !deleteConfirm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isMutating) return;
      setEntryForm(null);
      setDeleteConfirm(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteConfirm, entryForm, isMutating]);

  useEffect(() => {
    clearMemberSelection();
  }, [clearMemberSelection, selectedEntry?.id, selectedEntry?.kind]);

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

  const handleAddMember = async () => {
    const userIds = Array.from(selectedMemberUserIds);
    if (!selectedItem || !canAddMember || userIds.length === 0 || isMutating) {
      return;
    }
    try {
      if (selectedKind === "org") {
        for (const userId of userIds) {
          await addOrgMember.mutateAsync({
            orgUnitId: selectedItem.id,
            userId,
            isPrimary: memberIsPrimary,
          });
        }
        return;
      }
      if (selectedKind === "group") {
        for (const userId of userIds) {
          await addGroupMember.mutateAsync({
            groupId: selectedItem.id,
            userId,
          });
        }
      }
    } catch {
      // mutation側のonErrorで画面に表示する
    }
  };

  const handleRemoveMember = (
    membershipId: string,
    memberReadonly: boolean,
  ) => {
    if (memberReadonly || isMutating) return;
    if (selectedKind === "org") {
      if (readonly) return;
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
              組織とグループのメンバー、権限の適用状況を確認します
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
                    ? "組織名で検索"
                    : "グループ名・説明で検索"
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
                  ? (item as OrgUnit)._count.memberships
                  : (item as Group).memberships.length;
                const childCount = isOrg
                  ? (childCountByParent.get(item.id) ?? 0)
                  : 0;
                const summary = isOrg
                  ? `メンバー ${count}名 / 配下 ${childCount}組織`
                  : ((item as Group).description ?? "説明なし");

                return (
                  <div
                    key={`${entry.kind}:${item.id}`}
                    className={`border-border-subtle hover:bg-bg-card-hover mb-1 flex min-h-[56px] w-full items-center gap-1 rounded-lg border py-2 pr-3 text-left transition-colors ${
                      isSelected ? "bg-bg-active" : "bg-transparent"
                    } ${
                      isOrg
                        ? (depthPaddingClass[entry.depth] ?? "pl-32")
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
                        {directorySourceLabel[item.source]}
                      </span>
                      <span className="text-text-subtle text-[10px]">
                        {count}名
                      </span>
                    </button>
                  </div>
                );
              })
            )}
            {activeTab === "groups" && hasMoreGroups ? (
              <div className="border-border-subtle bg-bg-active text-text-muted mt-2 rounded-lg border px-3 py-2 text-[10px]">
                グループが{GROUP_DISPLAY_LIMIT}
                件を超えています。検索条件を絞り込んでください。
              </div>
            ) : null}
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
                      {directorySourceLabel[selectedItem.source]}
                    </span>
                  </div>
                  <h2 className="text-text-primary text-xl font-semibold">
                    {selectedItem.name}
                  </h2>
                  <p className="text-text-secondary mt-1 text-xs">
                    {selectedKind === "org"
                      ? `直接所属 ${memberRows.length}名`
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
                        ? getEditDisabledTooltip(selectedKind)
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
                    title={
                      readonly
                        ? getDeleteDisabledTooltip(selectedKind)
                        : undefined
                    }
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

              <div className="mb-4 grid gap-4 lg:grid-cols-4">
                {[
                  {
                    icon: selectedKind === "org" ? Building2 : Users,
                    label: "同期元",
                    value: directorySourceLabel[selectedItem.source],
                  },
                  {
                    icon: Shield,
                    label: "適用中のロール / 権限設定",
                    value: permissionSummaryQuery.isError
                      ? "取得失敗"
                      : permissionSummary
                        ? `${permissionSummary.summary.settingsCount} 件`
                        : "読み込み中",
                  },
                  {
                    icon: Shield,
                    label: "最終的な許可 / 拒否",
                    value: permissionSummaryQuery.isError
                      ? "取得失敗"
                      : permissionSummary
                        ? `許可 ${permissionSummary.summary.allowCount} / 拒否 ${permissionSummary.summary.denyCount}`
                        : "読み込み中",
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

              <div className="space-y-4">
                <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                  <div className="border-b-border-default flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
                    <h3 className="text-text-primary text-sm font-semibold">
                      メンバー
                    </h3>
                    <div className="flex min-w-0 flex-1 justify-end gap-2">
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
                        onClick={() => void handleAddMember()}
                        disabled={
                          !canAddMember ||
                          selectedMemberCount === 0 ||
                          isMutating
                        }
                        className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <UserPlus size={12} />
                        {selectedMemberCount > 0
                          ? `${selectedMemberCount}名を追加`
                          : "追加"}
                      </button>
                    </div>
                  </div>
                  {canAddMember ? (
                    <div className="border-b-border-default border-b px-5 py-3">
                      <div className="relative mb-3">
                        <Search
                          size={12}
                          className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
                        />
                        <input
                          type="text"
                          aria-label="追加するユーザーを検索"
                          placeholder="追加するユーザーを検索"
                          value={memberSearch}
                          onChange={(event) =>
                            setMemberSearch(event.target.value)
                          }
                          disabled={isMutating || usersQuery.isLoading}
                          className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-2 pr-3 pl-7 text-xs outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        />
                      </div>
                      {usersQuery.isLoading ? (
                        <div className="text-text-muted flex items-center gap-2 px-1 py-3 text-xs">
                          <Loader2 size={13} className="animate-spin" />
                          ユーザーを読み込み中
                        </div>
                      ) : visibleSelectableUsers.length === 0 ? (
                        <div className="text-text-muted px-1 py-3 text-xs">
                          追加できるユーザーはいません
                        </div>
                      ) : (
                        <div className="grid max-h-48 gap-2 overflow-y-auto md:grid-cols-2">
                          {visibleSelectableUsers.map((user: UserListItem) => (
                            <label
                              key={user.id}
                              className="bg-bg-active border-border-default flex min-h-[44px] items-center gap-3 rounded-lg border px-3 py-2 text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={selectedMemberUserIds.has(user.id)}
                                onChange={() => toggleMemberSelection(user.id)}
                                disabled={isMutating}
                                className="h-3.5 w-3.5 shrink-0"
                              />
                              <span className="min-w-0">
                                <span className="text-text-primary block truncate font-medium">
                                  {getUserLabel(user)}
                                </span>
                                <span className="text-text-muted block truncate text-[10px]">
                                  {user.email ?? "メール未設定"}
                                </span>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                  {selectedKind === "org" && orgMembersQuery.isLoading ? (
                    <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
                      <Loader2 size={13} className="animate-spin" />
                      メンバーを読み込み中
                    </div>
                  ) : selectedKind === "org" && orgMembersQuery.isError ? (
                    <div className="text-text-muted px-5 py-8 text-center text-xs">
                      メンバーを取得できませんでした
                    </div>
                  ) : memberRows.length === 0 ? (
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
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="bg-bg-active text-text-secondary flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium">
                              {member.image ? (
                                <img
                                  src={member.image}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                member.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-text-primary truncate font-medium">
                                {member.name}
                              </div>
                              <div className="text-text-muted truncate text-[10px]">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </Link>
                        <span
                          className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${
                            sourceBadgeClass[member.source]
                          }`}
                        >
                          {member.isPrimary
                            ? `${directorySourceLabel[member.source]} / 主所属`
                            : directorySourceLabel[member.source]}
                        </span>
                        <button
                          type="button"
                          aria-label={`${member.name} をメンバーから削除`}
                          onClick={() =>
                            handleRemoveMember(member.id, member.readonly)
                          }
                          disabled={member.readonly || isMutating}
                          title={
                            member.readonly
                              ? getMemberRemoveDisabledTooltip(selectedKind)
                              : undefined
                          }
                          className="text-text-muted flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <UserMinus size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </section>

                <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                  <div className="border-b-border-default flex items-center justify-between gap-3 border-b px-5 py-3">
                    <h3 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
                      <Shield size={14} />
                      適用中のロール / 権限設定
                    </h3>
                    <Link
                      href={`/admin/roles?targetType=${
                        selectedKind === "org" ? "org" : "group"
                      }&targetId=${selectedItem.id}`}
                      className="text-text-link text-[11px] underline-offset-2 hover:underline"
                    >
                      権限管理へ
                    </Link>
                  </div>
                  {permissionSummaryQuery.isLoading ? (
                    <div className="text-text-muted px-5 py-8 text-center text-xs">
                      権限設定を読み込み中
                    </div>
                  ) : permissionSummaryQuery.isError ? (
                    <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
                      <AlertCircle size={14} />
                      権限設定を取得できませんでした
                    </div>
                  ) : !permissionSummary ||
                    permissionSummary.settings.length === 0 ? (
                    <div className="text-text-muted px-5 py-8 text-center text-xs">
                      適用中の権限設定はありません
                    </div>
                  ) : (
                    permissionSummary.settings.map((setting) => (
                      <div
                        key={setting.id}
                        className="border-b-border-subtle grid gap-2 border-b px-5 py-3 text-xs md:grid-cols-[1fr_100px_120px]"
                      >
                        <div className="min-w-0">
                          <div className="text-text-primary truncate font-medium">
                            {setting.toolName ?? setting.catalogName}
                          </div>
                          <div className="text-text-muted mt-1 truncate text-[10px]">
                            {setting.toolName
                              ? setting.catalogName
                              : "カタログ"}
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
                    <h3 className="text-text-primary flex items-center gap-2 text-sm font-semibold">
                      <Shield size={14} />
                      最終的な許可 / 拒否
                    </h3>
                    {permissionSummary ? (
                      <span className="text-text-subtle text-[10px]">
                        許可 {permissionSummary.summary.allowCount} / 拒否{" "}
                        {permissionSummary.summary.denyCount} / 未設定{" "}
                        {permissionSummary.summary.unsetCount}
                      </span>
                    ) : null}
                  </div>
                  <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_80px_80px_140px] gap-3 border-b px-5 py-2.5 text-[10px] md:grid">
                    <span>提供ツール</span>
                    <span>リスク</span>
                    <span>結果</span>
                    <span>理由</span>
                  </div>
                  {permissionSummaryQuery.isLoading ? (
                    <div className="text-text-muted px-5 py-8 text-center text-xs">
                      最終結果を読み込み中
                    </div>
                  ) : permissionSummaryQuery.isError ? (
                    <div className="text-text-muted flex items-center justify-center gap-2 px-5 py-8 text-xs">
                      <AlertCircle size={14} />
                      権限設定を取得できませんでした
                    </div>
                  ) : !permissionSummary ||
                    permissionSummary.finalRows.length === 0 ? (
                    <div className="text-text-muted px-5 py-8 text-center text-xs">
                      表示できるツール権限がありません
                    </div>
                  ) : (
                    permissionSummary.finalRows.map((row) => (
                      <div
                        key={row.id}
                        className="border-b-border-subtle hover:bg-bg-card-hover grid gap-2 border-b px-5 py-3 text-xs transition-colors md:grid-cols-[1fr_80px_80px_140px]"
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
                    : "グループを設定"}
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
                <label className="block">
                  <span className="text-text-secondary text-[11px]">説明</span>
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
