"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Minus,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  X,
} from "lucide-react";
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
const PolicyEffect = { ALLOW: "ALLOW", DENY: "DENY" } as const;

type SyncStatusValue = (typeof SyncStatus)[keyof typeof SyncStatus];
type SyncTriggerValue = (typeof SyncTrigger)[keyof typeof SyncTrigger];
type PolicyEffectValue =
  | (typeof PolicyEffect)[keyof typeof PolicyEffect]
  | null;

/* ===== 型定義 ===== */

type GroupListItem = RouterOutputs["groups"]["list"][number];
type SyncLog = RouterOutputs["groups"]["getSyncLogs"][number];

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

type GroupTab = "members" | "tools" | "idp";

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
};

const IdpTab = ({ group, idpGroupMap, onIdpGroupChange }: IdpTabProps) => {
  const syncLogsQuery = api.groups.getSyncLogs.useQuery({ groupId: group.id });
  const syncLogs: SyncLog[] = syncLogsQuery.data ?? [];
  const syncStatusKey = getSyncStatusKey(group);
  const syncCfg = SYNC_STATUS_CONFIG[syncStatusKey];

  return (
    <div className="space-y-4">
      {/* IdPグループ設定 */}
      <div className="bg-bg-card border-border-default rounded-xl border p-4">
        <h2 className="text-text-primary mb-3 text-xs font-semibold">
          IdPグループ設定
        </h2>
        <label className="text-text-secondary mb-1 block text-[11px]">
          IdPグループ名（メールアドレス）
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="group@example.com"
            value={idpGroupMap[group.id] ?? ""}
            onChange={(e) => onIdpGroupChange(group.id, e.target.value)}
            className="bg-bg-app border-border-default text-text-secondary flex-1 rounded-lg border px-3 py-2 text-xs outline-none"
          />
          <button
            type="button"
            disabled
            className="bg-btn-primary-bg text-btn-primary-text min-h-[44px] cursor-not-allowed rounded-lg px-3 py-2 text-xs font-medium opacity-50"
          >
            保存
          </button>
        </div>
      </div>

      {/* 同期ステータス */}
      <div className="bg-bg-card border-border-default rounded-xl border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-text-primary text-xs font-semibold">
            同期ステータス
          </h2>
          <button
            type="button"
            disabled
            className="bg-bg-active text-text-secondary flex min-h-[44px] cursor-not-allowed items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium opacity-50"
          >
            <RefreshCw size={11} />
            手動同期
          </button>
        </div>
        <div className="flex items-center gap-2">
          {group.source === GroupSource.TUMIKI ? (
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
        <div className="border-b-border-default text-text-subtle grid grid-cols-[160px_80px_80px_50px_50px_1fr] items-center gap-3 border-b px-4 py-2 text-[10px]">
          <span>日時</span>
          <span>トリガー</span>
          <span>ステータス</span>
          <span className="text-right">追加</span>
          <span className="text-right">削除</span>
          <span>詳細</span>
        </div>
        {syncLogsQuery.isLoading && (
          <div className="text-text-muted px-4 py-6 text-center text-xs">
            読み込み中...
          </div>
        )}
        {!syncLogsQuery.isLoading && syncLogs.length === 0 && (
          <div className="text-text-muted px-4 py-6 text-center text-xs">
            同期履歴がありません
          </div>
        )}
        {syncLogs.map((log) => {
          const statusKey =
            log.status in HISTORY_STATUS_CONFIG
              ? (log.status as SyncStatusValue)
              : SyncStatus.FAILED;
          const hCfg = HISTORY_STATUS_CONFIG[statusKey];
          return (
            <div
              key={log.id}
              className="border-b-border-subtle grid grid-cols-[160px_80px_80px_50px_50px_1fr] items-start gap-3 border-b px-4 py-3 text-xs transition-colors hover:bg-white/[0.02]"
            >
              <span className="text-text-muted font-mono text-[11px]">
                {formatDateTime(log.startedAt)}
              </span>
              <span className="bg-bg-active text-text-muted rounded px-2 py-0.5 text-center text-[10px]">
                {TRIGGER_LABEL[log.trigger]}
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
              <span className="text-text-muted text-[10px]">—</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminGroupsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedOrgUnitId, setSelectedOrgUnitId] = useState<string | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<GroupTab>("members");
  // IdP連携: グループ別のIdPグループ名
  const [idpGroupMap, setIdpGroupMap] = useState<Record<string, string>>({});

  const groupsQuery = api.groups.list.useQuery();
  const utils = api.useUtils();
  const policyMatrixQuery = api.mcpPolicies.getMatrix.useQuery(undefined, {
    enabled: activeTab === "tools",
  });
  const updateToolPermission = api.mcpPolicies.updateToolPermission.useMutation(
    {
      onSuccess: async () => utils.mcpPolicies.getMatrix.invalidate(),
    },
  );
  const groups = groupsQuery.data ?? [];
  const orgUnits = policyMatrixQuery.data?.orgUnits ?? [];
  const catalogs = policyMatrixQuery.data?.catalogs ?? [];

  /* 選択中グループのオブジェクトを取得 */
  const selectedGroup = groups.find((g) => g.id === selectedGroupId) ?? null;
  const selectedOrgUnit =
    orgUnits.find((unit) => unit.id === selectedOrgUnitId) ??
    orgUnits[0] ??
    null;
  const selectedOrgUnitPermissionByTool = useMemo(
    () =>
      new Map(
        catalogs.flatMap((catalog) =>
          catalog.tools.flatMap((tool) =>
            tool.orgUnitPermissions
              .filter(
                (permission) => permission.orgUnitId === selectedOrgUnit?.id,
              )
              .map((permission) => [tool.id, permission.effect] as const),
          ),
        ),
      ),
    [catalogs, selectedOrgUnit?.id],
  );

  /* グループ一覧フィルタリング */
  const filteredGroups = groups.filter(
    (g) =>
      search === "" ||
      g.name.includes(search) ||
      (g.description ?? "").includes(search),
  );

  /* グループ選択ハンドラ */
  const handleSelectGroup = (group: GroupListItem) => {
    setSelectedGroupId(group.id);
    setActiveTab("members");
    // IdPグループ名の初期値をexternalIdから設定
    setIdpGroupMap((prev) => {
      if (prev[group.id] !== undefined) return prev;
      return { ...prev, [group.id]: group.externalId ?? "" };
    });
  };

  /* IdPグループ名更新ハンドラ */
  const handleIdpGroupChange = (groupId: string, value: string) => {
    setIdpGroupMap((prev) => ({ ...prev, [groupId]: value }));
  };

  return (
    <div className="flex h-full min-h-screen">
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
                className={`border-b-border-subtle min-h-[44px] w-full border-b px-4 py-3 text-left transition-colors hover:bg-white/[0.02] ${isSelected ? "bg-bg-active" : ""}`}
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
              <div className="flex items-center gap-3">
                <span
                  className={`h-3.5 w-3.5 rounded-full ${getGroupColorClass(selectedGroup.id)}`}
                />
                <h1 className="text-text-primary text-base font-semibold">
                  {selectedGroup.name}
                </h1>
                <span className="text-text-muted text-xs">
                  {selectedGroup.description ?? ""}
                </span>
              </div>
            </div>

            {/* タブ */}
            <div className="border-b-border-default flex gap-0 border-b px-6">
              {(
                [
                  { id: "members", label: "メンバー" },
                  { id: "tools", label: "部署別MCP権限" },
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
                        className="border-b-border-subtle grid grid-cols-[1fr_200px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors hover:bg-white/[0.02]"
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

              {/* 部署別MCP権限タブ */}
              {activeTab === "tools" && (
                <div className="grid grid-cols-[260px_1fr] gap-4">
                  <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                    <div className="border-b-border-default border-b px-4 py-3">
                      <h2 className="text-text-primary text-xs font-semibold">
                        部署ツリー
                      </h2>
                    </div>
                    {policyMatrixQuery.isLoading && (
                      <div className="text-text-muted px-4 py-6 text-center text-xs">
                        読み込み中...
                      </div>
                    )}
                    {orgUnits.length === 0 && !policyMatrixQuery.isLoading && (
                      <div className="text-text-muted px-4 py-6 text-center text-xs">
                        SCIM部署がまだ同期されていません
                      </div>
                    )}
                    {orgUnits.map((orgUnit) => (
                      <button
                        key={orgUnit.id}
                        type="button"
                        onClick={() => setSelectedOrgUnitId(orgUnit.id)}
                        className={`border-b-border-subtle min-h-[44px] w-full border-b px-4 py-3 text-left text-xs transition-colors hover:bg-white/[0.02] ${
                          selectedOrgUnit?.id === orgUnit.id
                            ? "bg-bg-active"
                            : ""
                        }`}
                      >
                        <div className="text-text-primary font-medium">
                          {orgUnit.name}
                        </div>
                        <div className="text-text-muted mt-1 truncate font-mono text-[10px]">
                          {orgUnit.path}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                    <div className="border-b-border-default flex items-center justify-between border-b px-4 py-3">
                      <h2 className="text-text-primary text-xs font-semibold">
                        {selectedOrgUnit?.name ?? "部署"} のMCPツール権限
                      </h2>
                      <span className="text-text-subtle text-[10px]">
                        ALLOW / DENY / 未設定
                      </span>
                    </div>
                    {selectedOrgUnit === null ? (
                      <div className="text-text-muted px-4 py-8 text-center text-xs">
                        部署を選択してください
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--color-border-subtle)]">
                        {catalogs.map((catalog) => (
                          <div key={catalog.id} className="p-4">
                            <div className="text-text-primary mb-3 text-xs font-semibold">
                              {catalog.name}
                            </div>
                            <div className="space-y-2">
                              {catalog.tools.map((tool) => {
                                const effect =
                                  selectedOrgUnitPermissionByTool.get(
                                    tool.id,
                                  ) ?? null;
                                const setEffect = (next: PolicyEffectValue) =>
                                  updateToolPermission.mutate({
                                    orgUnitId: selectedOrgUnit.id,
                                    catalogId: catalog.id,
                                    toolId: tool.id,
                                    effect: next,
                                  });
                                return (
                                  <div
                                    key={tool.id}
                                    className="grid grid-cols-[1fr_130px] items-center gap-3"
                                  >
                                    <div>
                                      <div className="text-text-secondary text-xs">
                                        {tool.name}
                                      </div>
                                      <div className="text-text-muted mt-0.5 text-[10px]">
                                        {tool.description ?? ""}
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-1">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEffect(PolicyEffect.ALLOW)
                                        }
                                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 ${
                                          effect === "ALLOW"
                                            ? "bg-emerald-500/20 text-emerald-300"
                                            : "bg-bg-active text-text-muted"
                                        }`}
                                        title="許可"
                                      >
                                        <Check size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEffect(PolicyEffect.DENY)
                                        }
                                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 ${
                                          effect === "DENY"
                                            ? "bg-red-500/20 text-red-300"
                                            : "bg-bg-active text-text-muted"
                                        }`}
                                        title="拒否"
                                      >
                                        <X size={13} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEffect(null)}
                                        className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md p-1.5 ${
                                          effect === null
                                            ? "bg-bg-active text-text-secondary"
                                            : "bg-bg-active text-text-muted"
                                        }`}
                                        title="未設定"
                                      >
                                        <Minus size={13} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* IdP連携タブ */}
              {activeTab === "idp" && (
                <IdpTab
                  group={selectedGroup}
                  idpGroupMap={idpGroupMap}
                  onIdpGroupChange={handleIdpGroupChange}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminGroupsPage;
