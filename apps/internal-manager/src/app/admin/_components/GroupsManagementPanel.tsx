"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Edit3,
  Link2,
  Lock,
  Plus,
  Search,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import {
  getUserById,
  mockGroups,
  sourceBadgeClass,
  sourceLabel,
  type MockUser,
} from "./idp-ui-mock-data";

type GroupTab = "members" | "policies" | "sync";

const GROUP_TABS = [
  { id: "members", label: "メンバー" },
  { id: "policies", label: "割り当て権限" },
  { id: "sync", label: "同期状態" },
] as const satisfies { id: GroupTab; label: string }[];

const syncLabel = {
  synced: "同期済み",
  manual: "手動",
  pending: "未同期",
} as const;

export const GroupsManagementPanel = ({
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("ai-program");
  const [activeTab, setActiveTab] = useState<GroupTab>("members");
  const selectedGroup =
    mockGroups.find((group) => group.id === selectedGroupId) ?? mockGroups[0]!;
  const members = useMemo(
    () =>
      selectedGroup.memberIds
        .map(getUserById)
        .filter((user): user is MockUser => Boolean(user)),
    [selectedGroup.memberIds],
  );
  const filteredGroups = useMemo(
    () =>
      mockGroups.filter(
        (group) =>
          search === "" ||
          group.name.includes(search) ||
          group.description.includes(search) ||
          sourceLabel[group.source].includes(search),
      ),
    [search],
  );
  const Heading = embedded ? "h2" : "h1";

  return (
    <div
      className={
        embedded
          ? "flex min-h-[560px] flex-col md:h-[calc(100vh-220px)] md:flex-row"
          : "flex min-h-screen flex-col md:h-full md:flex-row"
      }
    >
      <aside className="border-r-border-default flex w-full shrink-0 flex-col border-r md:w-[320px]">
        <div className="border-b-border-default flex items-center justify-between border-b px-4 py-3">
          <div>
            <Heading className="text-text-primary text-sm font-semibold">
              グループ
            </Heading>
            <p className="text-text-muted mt-1 text-[10px]">
              Okta Directory Groups 型の一覧
            </p>
          </div>
          <button
            type="button"
            disabled
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] cursor-not-allowed items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-60"
          >
            <Plus size={11} />
            作成
          </button>
        </div>

        <div className="border-b-border-default border-b px-3 py-2.5">
          <div className="relative">
            <Search
              size={12}
              className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="名前・sourceで検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filteredGroups.map((group) => {
            const isSelected = selectedGroup.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroupId(group.id)}
                className={`border-b-border-subtle hover:bg-bg-card-hover min-h-[68px] w-full border-b px-4 py-3 text-left transition-colors ${
                  isSelected ? "bg-bg-active" : ""
                }`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-text-primary min-w-0 flex-1 truncate text-xs font-medium">
                    {group.name}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] ${sourceBadgeClass[group.source]}`}
                  >
                    {sourceLabel[group.source]}
                  </span>
                </div>
                <p className="text-text-muted truncate text-[10px]">
                  {group.description}
                </p>
                <div className="text-text-subtle mt-1 flex gap-2 text-[10px]">
                  <span>{group.memberIds.length}名</span>
                  <span>{syncLabel[group.syncState]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="flex flex-1 flex-col">
        <div className="border-b-border-default border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] ${sourceBadgeClass[selectedGroup.source]}`}
                >
                  {sourceLabel[selectedGroup.source]}
                </span>
                {selectedGroup.readonly ? (
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
              <Heading className="text-text-primary truncate text-base font-semibold">
                {selectedGroup.name}
              </Heading>
              <p className="text-text-secondary mt-1 text-xs">
                {selectedGroup.description}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={selectedGroup.readonly}
                className="bg-bg-active text-text-secondary flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Edit3 size={12} />
                編集
              </button>
              <button
                type="button"
                disabled={selectedGroup.readonly}
                className="bg-bg-active flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={12} />
                削除
              </button>
              <Link
                href={`/admin/roles?targetType=group&targetId=${selectedGroup.id}`}
                className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium"
              >
                <Shield size={12} />
                権限管理へ
              </Link>
            </div>
          </div>
        </div>

        <div
          className="border-b-border-default flex gap-0 border-b px-6"
          role="tablist"
          aria-label="グループ詳細タブ"
        >
          {GROUP_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`group-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`group-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] border-b-2 px-4 py-2.5 text-xs transition-colors ${
                activeTab === tab.id
                  ? "border-text-primary text-text-primary font-medium"
                  : "text-text-secondary hover:text-text-primary border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div
          id={`group-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`group-tab-${activeTab}`}
          className="flex-1 overflow-y-auto p-6"
        >
          {activeTab === "members" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">
                  {members.length}名のメンバー
                </span>
                <button
                  type="button"
                  disabled={selectedGroup.readonly}
                  className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={12} />
                  メンバー追加
                </button>
              </div>
              <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                <div className="border-b-border-default text-text-subtle hidden grid-cols-[1fr_150px_120px_80px] items-center gap-3 border-b px-5 py-2.5 text-[10px] sm:grid">
                  <span>ユーザー</span>
                  <span>役割</span>
                  <span>source</span>
                  <span className="text-right">操作</span>
                </div>
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[1fr_auto] items-center gap-3 border-b px-5 py-3 text-xs transition-colors sm:grid-cols-[1fr_150px_120px_80px]"
                  >
                    <div className="min-w-0">
                      <div className="text-text-primary font-medium">
                        {member.name}
                      </div>
                      <div className="text-text-muted truncate text-[10px]">
                        {member.email}
                      </div>
                    </div>
                    <span className="text-text-secondary">{member.title}</span>
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 text-[10px] ${sourceBadgeClass[member.source]}`}
                    >
                      {sourceLabel[member.source]}
                    </span>
                    <button
                      type="button"
                      aria-label="メンバー削除"
                      disabled={selectedGroup.readonly}
                      className="text-text-muted bg-bg-active ml-auto flex min-h-[44px] w-11 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40"
                      title="メンバー削除"
                    >
                      <UserMinus size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "policies" && (
            <section className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
              <div className="border-b-border-default px-5 py-3">
                <h2 className="text-text-primary text-sm font-semibold">
                  グループ単位の例外権限
                </h2>
                <p className="text-text-muted mt-1 text-[10px]">
                  組織標準権限に対して、部署横断のチームだけを補正します。
                </p>
              </div>
              {selectedGroup.assignedPolicies.map((policy) => (
                <div
                  key={policy}
                  className="border-b-border-subtle flex items-center justify-between gap-3 border-b px-5 py-3 text-xs"
                >
                  <span className="text-text-primary">{policy}</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    許可
                  </span>
                </div>
              ))}
            </section>
          )}

          {activeTab === "sync" && (
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="bg-bg-card border-border-default rounded-xl border p-4">
                <h2 className="text-text-primary mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Link2 size={14} />
                  IdP mapping
                </h2>
                <div className="bg-bg-active rounded-lg px-3 py-3">
                  <div className="text-text-muted text-[10px]">外部識別子</div>
                  <div className="text-text-primary mt-1 font-mono text-xs">
                    {selectedGroup.externalId ?? "Tumiki manual group"}
                  </div>
                </div>
              </div>
              <div className="bg-bg-card border-border-default rounded-xl border p-4">
                <h2 className="text-text-primary mb-3 text-sm font-semibold">
                  同期ステータス
                </h2>
                <div className="text-text-primary text-2xl font-semibold">
                  {syncLabel[selectedGroup.syncState]}
                </div>
                <p className="text-text-muted mt-2 text-xs">
                  外部 IdP 由来の membership は readonly。Tumiki
                  独自グループだけ手動編集できます。
                </p>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
};
