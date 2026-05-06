"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Shield, UserPlus } from "lucide-react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

// @tumiki/internal-db を client でインポートすると Prisma の node: モジュールが混入するため、
// 文字列定数として再定義する
const GroupSource = { IDP: "IDP", TUMIKI: "TUMIKI" } as const;
const SyncStatus = {
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  PARTIAL: "PARTIAL",
} as const;
const SyncTrigger = { JIT: "JIT", SCIM: "SCIM", MANUAL: "MANUAL" } as const;

type SyncStatusValue = (typeof SyncStatus)[keyof typeof SyncStatus];
type SyncTriggerValue = (typeof SyncTrigger)[keyof typeof SyncTrigger];

/* ===== 型定義 ===== */

type GroupListItem = RouterOutputs["groups"]["list"][number];
type SyncLog = RouterOutputs["groups"]["getSyncLogs"][number];

const GROUP_DISPLAY_LIMIT = 200;

/* ===== グループカラー（IDから決定論的に導出） ===== */

const PRESET_COLOR_CLASSES = [
  "bg-[#a78bfa]",
  "bg-[#34d399]",
  "bg-[#fbbf24]",
  "bg-[#f87171]",
  "bg-[#60a5fa]",
  "bg-[#fb923c]",
  "bg-[#4ade80]",
  "bg-[#f472b6]",
];

const getGroupColorClass = (id: string): string => {
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const index = hash % PRESET_COLOR_CLASSES.length;
  return (
    PRESET_COLOR_CLASSES[index] ?? PRESET_COLOR_CLASSES[0] ?? "bg-[#a78bfa]"
  );
};

/* ===== 同期ステータスのスタイル ===== */

type SyncStatusKey = "synced" | "pending";

const SYNC_STATUS_CONFIG: Record<
  SyncStatusKey,
  { bg: string; text: string; label: string }
> = {
  synced: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    label: "同期済み",
  },
  pending: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    label: "未設定",
  },
};

/* ===== 同期履歴ステータスのスタイル ===== */

const HISTORY_STATUS_CONFIG: Record<
  SyncStatusValue,
  { bg: string; text: string; label: string }
> = {
  [SyncStatus.SUCCESS]: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    label: "成功",
  },
  [SyncStatus.FAILED]: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    label: "失敗",
  },
  [SyncStatus.PARTIAL]: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    label: "一部失敗",
  },
};

/* ===== 同期トリガーのラベル ===== */

const TRIGGER_LABEL: Record<SyncTriggerValue, string> = {
  [SyncTrigger.JIT]: "JIT",
  [SyncTrigger.SCIM]: "SCIM",
  [SyncTrigger.MANUAL]: "手動",
};

/* ===== グループの同期ステータスキーを導出 ===== */

const getSyncStatusKey = (group: GroupListItem): SyncStatusKey => {
  if (group.source === GroupSource.TUMIKI) return "pending";
  return group.lastSyncedAt !== null ? "synced" : "pending";
};

/* ===== タブ定義 ===== */

type GroupTab = "members" | "idp";

/* ===== 日時フォーマット ===== */

const formatDateTime = (date: Date): string => {
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ===== IdP連携タブコンポーネント ===== */

type IdpTabProps = {
  group: GroupListItem;
  idpGroupMap: Record<string, string>;
  onIdpGroupChange: (groupId: string, value: string) => void;
  onSaveIdpMapping: (groupId: string) => void;
  isSaving: boolean;
};

const IdpTab = ({
  group,
  idpGroupMap,
  onIdpGroupChange,
  onSaveIdpMapping,
  isSaving,
}: IdpTabProps) => {
  const syncLogsQuery = api.groups.getSyncLogs.useQuery({ groupId: group.id });
  const syncLogs: SyncLog[] = syncLogsQuery.data ?? [];
  const syncCfg =
    group.source === GroupSource.TUMIKI
      ? null
      : SYNC_STATUS_CONFIG[getSyncStatusKey(group)];
  const mappingValue = idpGroupMap[group.id] ?? "";

  return (
    <div className="space-y-4">
      {/* IdPグループ設定 */}
      <div className="bg-bg-card border-border-default rounded-xl border p-4">
        <h2 className="text-text-primary mb-3 text-xs font-semibold">
          IdPグループ設定
        </h2>
        <label className="text-text-secondary mb-1 block text-[11px]">
          IdPグループ識別子
        </label>
        {group.source === GroupSource.IDP ? (
          <div className="bg-bg-app border-border-default rounded-lg border px-3 py-2">
            <p className="text-text-muted text-xs">
              SCIMで自動同期されたグループです。IdPマッピングはTumiki作成グループにのみ設定できます。
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="IdP group id / name / email"
              value={mappingValue}
              onChange={(e) => onIdpGroupChange(group.id, e.target.value)}
              className="bg-bg-app border-border-default text-text-secondary flex-1 rounded-lg border px-3 py-2 text-xs outline-none"
            />
            <button
              type="button"
              onClick={() => onSaveIdpMapping(group.id)}
              disabled={isSaving}
              className="bg-btn-primary-bg text-btn-primary-text min-h-[44px] rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "保存中" : "保存"}
            </button>
          </div>
        )}
        {group.externalId && (
          <p className="text-text-muted mt-2 text-[10px]">
            現在の紐付け: {group.provider ?? "scim"} / {group.externalId}
          </p>
        )}
      </div>

      {/* 同期ステータス */}
      <div className="bg-bg-card border-border-default rounded-xl border p-4">
        <div className="mb-3 flex items-center">
          <h2 className="text-text-primary text-xs font-semibold">
            同期ステータス
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {syncCfg === null ? (
            <span className="text-text-muted text-[11px]">-</span>
          ) : (
            <>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${syncCfg.bg} ${syncCfg.text}`}
              >
                {syncCfg.label}
              </span>
              {group.lastSyncedAt !== null ? (
                <span className="text-text-muted font-mono text-[11px]">
                  最終同期: {formatDateTime(group.lastSyncedAt)}
                </span>
              ) : (
                <span className="text-text-muted text-[11px]">
                  まだ同期されていません
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 同期履歴テーブル */}
      <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
        <div className="border-b-border-default px-4 py-3">
          <h2 className="text-text-primary text-xs font-semibold">同期履歴</h2>
        </div>
        <div className="overflow-x-auto">
          <div className="border-b-border-default text-text-subtle grid min-w-[600px] grid-cols-[160px_80px_80px_50px_50px_1fr] items-center gap-3 border-b px-4 py-2 text-[10px]">
            <span>日時</span>
            <span>トリガー</span>
            <span>ステータス</span>
            <span className="text-right">追加</span>
            <span className="text-right">削除</span>
            <span>詳細</span>
          </div>
          {syncLogsQuery.isLoading && (
            <div className="text-text-muted min-w-[600px] px-4 py-6 text-center text-xs">
              読み込み中...
            </div>
          )}
          {syncLogsQuery.isError && (
            <div className="min-w-[600px] px-4 py-6 text-center text-xs text-red-400">
              同期履歴の読み込みに失敗しました
            </div>
          )}
          {!syncLogsQuery.isLoading &&
            !syncLogsQuery.isError &&
            syncLogs.length === 0 && (
              <div className="text-text-muted min-w-[600px] px-4 py-6 text-center text-xs">
                同期履歴がありません
              </div>
            )}
          {syncLogs.map((log) => {
            const statusKey =
              log.status in HISTORY_STATUS_CONFIG
                ? (log.status as SyncStatusValue)
                : SyncStatus.FAILED;
            const triggerLabel =
              TRIGGER_LABEL[log.trigger as SyncTriggerValue] ?? log.trigger;
            const hCfg = HISTORY_STATUS_CONFIG[statusKey];
            return (
              <div
                key={log.id}
                className="border-b-border-subtle hover:bg-bg-card-hover grid min-w-[600px] grid-cols-[160px_80px_80px_50px_50px_1fr] items-start gap-3 border-b px-4 py-3 text-xs transition-colors"
              >
                <span className="text-text-muted font-mono text-[11px]">
                  {formatDateTime(log.startedAt)}
                </span>
                <span className="bg-bg-active text-text-muted rounded px-2 py-0.5 text-center text-[10px]">
                  {triggerLabel}
                </span>
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-center text-[10px] font-medium ${hCfg.bg} ${hCfg.text}`}
                >
                  {hCfg.label}
                </span>
                <span className="text-text-secondary text-right font-mono">
                  +{log.added}
                </span>
                <span className="text-text-secondary text-right font-mono">
                  -{log.removed}
                </span>
                <span className="text-text-muted text-[10px]">
                  {log.detail ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const GroupsManagementPanel = ({
  embedded = false,
}: {
  embedded?: boolean;
}) => {
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>("members");
  const [idpGroupMap, setIdpGroupMap] = useState<Record<string, string>>({});
  const utils = api.useUtils();
  const updateIdpMapping = api.groups.updateIdpMapping.useMutation({
    onSuccess: async (updatedGroup) => {
      setIdpGroupMap((prev) => ({
        ...prev,
        [updatedGroup.id]: updatedGroup.externalId ?? "",
      }));
      await utils.groups.list.invalidate();
    },
  });
  const mutationError = updateIdpMapping.error;

  const groupsQuery = api.groups.list.useQuery();
  const groups = groupsQuery.data ?? [];
  const hasMoreGroups = groups.length > GROUP_DISPLAY_LIMIT;
  const visibleGroups = hasMoreGroups
    ? groups.slice(0, GROUP_DISPLAY_LIMIT)
    : groups;
  const Heading = embedded ? "h2" : "h1";

  /* 選択中グループのオブジェクトを取得 */
  const selectedGroup =
    visibleGroups.find((g) => g.id === selectedGroupId) ?? null;

  /* グループ一覧フィルタリング */
  const filteredGroups = visibleGroups.filter(
    (g) =>
      search === "" ||
      g.name.includes(search) ||
      (g.description ?? "").includes(search),
  );

  /* グループ選択ハンドラ */
  const handleSelectGroup = (group: GroupListItem) => {
    setSelectedGroupId(group.id);
    updateIdpMapping.reset();
    setIdpGroupMap((prev) => {
      if (prev[group.id] !== undefined) return prev;
      return { ...prev, [group.id]: group.externalId ?? "" };
    });
  };

  const handleIdpGroupChange = (groupId: string, value: string) => {
    setIdpGroupMap((prev) => ({ ...prev, [groupId]: value }));
  };

  const handleSaveIdpMapping = (groupId: string) => {
    const value = idpGroupMap[groupId]?.trim() ?? "";
    updateIdpMapping.mutate({
      groupId,
      externalId: value.length > 0 ? value : null,
    });
  };

  return (
    <div
      className={
        embedded
          ? "flex h-[calc(100vh-220px)] min-h-[560px]"
          : "flex h-full min-h-screen"
      }
    >
      {/* 左カラム: グループ一覧 */}
      <div className="border-r-border-default flex w-[280px] shrink-0 flex-col border-r">
        {/* 左ヘッダー */}
        <div className="border-b-border-default flex items-center justify-between border-b px-4 py-3">
          <span className="text-text-primary text-sm font-semibold">
            グループ
          </span>
          <button
            type="button"
            disabled
            className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] cursor-not-allowed items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium opacity-50"
          >
            <Plus size={11} />
            追加
          </button>
        </div>

        {/* 検索 */}
        <div className="border-b-border-default border-b px-3 py-2.5">
          <div className="relative">
            <Search
              size={12}
              className="text-text-muted absolute top-1/2 left-2.5 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="グループを検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-bg-active border-border-default text-text-secondary w-full rounded-lg border py-1.5 pr-3 pl-7 text-xs outline-none"
            />
          </div>
        </div>

        {/* グループカード一覧 */}
        <div className="flex-1 overflow-y-auto py-1">
          {groupsQuery.isLoading && (
            <div className="text-text-muted px-4 py-6 text-center text-xs">
              読み込み中...
            </div>
          )}
          {groupsQuery.isError && (
            <div className="px-4 py-6 text-center text-xs text-red-400">
              グループの読み込みに失敗しました
            </div>
          )}
          {hasMoreGroups && (
            <div className="border-b-border-subtle bg-amber-500/10 px-4 py-2 text-[10px] text-amber-300">
              表示上限の200件まで表示しています
            </div>
          )}
          {!groupsQuery.isLoading &&
            !groupsQuery.isError &&
            filteredGroups.length === 0 && (
              <div className="text-text-muted px-4 py-6 text-center text-xs">
                {search ? "検索結果がありません" : "グループがありません"}
              </div>
            )}
          {filteredGroups.map((group) => {
            const syncStatusKey = getSyncStatusKey(group);
            const syncCfg = SYNC_STATUS_CONFIG[syncStatusKey];
            const colorClass = getGroupColorClass(group.id);
            const isSelected = selectedGroupId === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectGroup(group)}
                className={`border-b-border-subtle hover:bg-bg-card-hover min-h-[44px] w-full border-b px-4 py-3 text-left transition-colors ${isSelected ? "bg-bg-active" : ""}`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  {/* グループカラードット */}
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`}
                  />
                  <span className="text-text-primary flex-1 truncate text-xs font-medium">
                    {group.name}
                  </span>
                  {/* 同期ステータスバッジ */}
                  {group.source === GroupSource.IDP ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${syncCfg.bg} ${syncCfg.text}`}
                    >
                      {syncCfg.label}
                    </span>
                  ) : (
                    <span className="text-text-subtle text-[9px]">-</span>
                  )}
                </div>
                <div className="text-text-muted mb-1.5 truncate pl-4.5 text-[10px]">
                  {group.description ?? ""}
                </div>
                <div className="flex items-center gap-2 pl-4.5">
                  <span className="text-text-subtle text-[10px]">
                    {group.memberships.length}名
                  </span>
                  {group.externalId && (
                    <span className="text-text-subtle truncate font-mono text-[9px]">
                      {group.externalId}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 右パネル: グループ詳細 */}
      <div className="flex flex-1 flex-col">
        {selectedGroup === null ? (
          /* 未選択状態 */
          <div className="flex flex-1 items-center justify-center">
            <span className="text-text-muted text-sm">
              グループを選択してください
            </span>
          </div>
        ) : (
          <>
            {/* 詳細ヘッダー */}
            <div className="border-b-border-default border-b px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`h-3.5 w-3.5 shrink-0 rounded-full ${getGroupColorClass(selectedGroup.id)}`}
                  />
                  <Heading className="text-text-primary truncate text-base font-semibold">
                    {selectedGroup.name}
                  </Heading>
                  <span className="text-text-muted truncate text-xs">
                    {selectedGroup.description ?? ""}
                  </span>
                </div>
                <Link
                  href="/admin/roles"
                  className="bg-bg-active text-text-secondary flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                >
                  <Shield size={12} />
                  権限管理へ
                </Link>
              </div>
            </div>

            {/* タブ */}
            <div className="border-b-border-default flex gap-0 border-b px-6">
              {(
                [
                  { id: "members", label: "メンバー" },
                  { id: "idp", label: "IdP連携" },
                ] as { id: GroupTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
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

            {/* タブコンテンツ */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* メンバータブ */}
              {activeTab === "members" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary text-xs">
                      {selectedGroup.memberships.length}名のメンバー
                    </span>
                    <button
                      type="button"
                      disabled
                      className="bg-btn-primary-bg text-btn-primary-text flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium opacity-50"
                    >
                      <UserPlus size={12} />
                      メンバー追加
                    </button>
                  </div>
                  {/* メンバーテーブル */}
                  <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                    <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_200px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
                      <span>ユーザー</span>
                      <span>メールアドレス</span>
                    </div>
                    {selectedGroup.memberships.length === 0 && (
                      <div className="text-text-muted px-5 py-6 text-center text-xs">
                        メンバーがいません
                      </div>
                    )}
                    {selectedGroup.memberships.map((membership) => (
                      <div
                        key={membership.id}
                        className="border-b-border-subtle hover:bg-bg-card-hover grid grid-cols-[1fr_200px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="bg-bg-active text-text-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            {(
                              membership.user.name ??
                              membership.user.email ??
                              "?"
                            ).charAt(0)}
                          </div>
                          <span className="text-text-primary font-medium">
                            {membership.user.name ??
                              membership.user.email ??
                              "—"}
                          </span>
                        </div>
                        <span className="text-text-muted font-mono text-[11px]">
                          {membership.user.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* IdP連携タブ */}
              {activeTab === "idp" && (
                <div className="space-y-3">
                  <IdpTab
                    group={selectedGroup}
                    idpGroupMap={idpGroupMap}
                    onIdpGroupChange={handleIdpGroupChange}
                    onSaveIdpMapping={handleSaveIdpMapping}
                    isSaving={updateIdpMapping.isPending}
                  />
                  {mutationError && (
                    <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {mutationError.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
