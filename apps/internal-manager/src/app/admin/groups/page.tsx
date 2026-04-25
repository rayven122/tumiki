"use client";

import { useState } from "react";
import { Plus, RefreshCw, Search, UserPlus } from "lucide-react";
import {
  GROUPS,
  ORG_USERS,
  SYNC_HISTORY,
  TOOLS,
  type Group,
  type GroupSyncStatus,
  type SyncHistoryStatus,
  type SyncTrigger,
} from "../_components/mock-data";

/* ===== 同期ステータスのスタイル ===== */

const SYNC_STATUS_CONFIG: Record<
  GroupSyncStatus,
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
  error: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    label: "エラー",
  },
};

/* ===== 同期履歴ステータスのスタイル ===== */

const HISTORY_STATUS_CONFIG: Record<
  SyncHistoryStatus,
  { bg: string; text: string; label: string }
> = {
  success: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    label: "成功",
  },
  failed: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    label: "失敗",
  },
  partial: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    label: "一部失敗",
  },
};

/* ===== 同期トリガーのラベル ===== */

const TRIGGER_LABEL: Record<SyncTrigger, string> = {
  jit: "JIT",
  scim: "SCIM",
  manual: "手動",
};

/* ===== タブ定義 ===== */

type GroupTab = "members" | "tools" | "idp";

const AdminGroupsPage = () => {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<GroupTab>("members");
  // MCP権限: グループ別の許可ツールID一覧
  const [allowedToolsMap, setAllowedToolsMap] = useState<
    Record<string, string[]>
  >(() => {
    const map: Record<string, string[]> = {};
    for (const g of GROUPS) {
      map[g.id] = [...g.allowedTools];
    }
    return map;
  });
  // IdP連携: グループ別のIdPグループ名
  const [idpGroupMap, setIdpGroupMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const g of GROUPS) {
      map[g.id] = g.idpGroup ?? "";
    }
    return map;
  });

  /* グループ一覧フィルタリング */
  const filteredGroups = GROUPS.filter(
    (g) =>
      search === "" ||
      g.name.includes(search) ||
      g.description.includes(search),
  );

  /* グループ選択ハンドラ */
  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
    setActiveTab("members");
  };

  /* MCP権限トグル */
  const toggleTool = (groupId: string, toolId: string) => {
    setAllowedToolsMap((prev) => {
      const current = prev[groupId] ?? [];
      const next = current.includes(toolId)
        ? current.filter((id) => id !== toolId)
        : [...current, toolId];
      return { ...prev, [groupId]: next };
    });
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
            className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-opacity hover:opacity-80"
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
          {filteredGroups.map((group) => {
            const syncCfg = SYNC_STATUS_CONFIG[group.syncStatus];
            const isSelected = selectedGroup?.id === group.id;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectGroup(group)}
                className={`border-b-border-subtle w-full border-b px-4 py-3 text-left transition-colors hover:bg-white/[0.02] ${isSelected ? "bg-bg-active" : ""}`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  {/* グループカラードット */}
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="text-text-primary flex-1 truncate text-xs font-medium">
                    {group.name}
                  </span>
                  {/* 同期ステータスバッジ */}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${syncCfg.bg} ${syncCfg.text}`}
                  >
                    {syncCfg.label}
                  </span>
                </div>
                <div className="text-text-muted mb-1.5 truncate pl-4.5 text-[10px]">
                  {group.description}
                </div>
                <div className="flex items-center gap-2 pl-4.5">
                  <span className="text-text-subtle text-[10px]">
                    {group.memberCount}名
                  </span>
                  {group.idpGroup && (
                    <span className="text-text-subtle truncate font-mono text-[9px]">
                      {group.idpGroup}
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
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: selectedGroup.color }}
                />
                <h1 className="text-text-primary text-base font-semibold">
                  {selectedGroup.name}
                </h1>
                <span className="text-text-muted text-xs">
                  {selectedGroup.description}
                </span>
              </div>
            </div>

            {/* タブ */}
            <div className="border-b-border-default flex gap-0 border-b px-6">
              {(
                [
                  { id: "members", label: "メンバー" },
                  { id: "tools", label: "MCP権限" },
                  { id: "idp", label: "IdP連携" },
                ] as { id: GroupTab; label: string }[]
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-4 py-2.5 text-xs transition-colors ${
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
                      {selectedGroup.memberCount}名のメンバー
                    </span>
                    <button
                      type="button"
                      className="bg-btn-primary-bg text-btn-primary-text flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    >
                      <UserPlus size={12} />
                      メンバー追加
                    </button>
                  </div>
                  {/* メンバーテーブル */}
                  <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                    <div className="border-b-border-default text-text-subtle grid grid-cols-[1fr_180px_100px] items-center gap-3 border-b px-5 py-2.5 text-[10px]">
                      <span>ユーザー</span>
                      <span>メールアドレス</span>
                      <span>ロール</span>
                    </div>
                    {ORG_USERS.filter((u) => {
                      /* グループに対応する部署のユーザーをフィルタ（簡易モック） */
                      if (selectedGroup.id === "g1")
                        return u.department === "開発部";
                      if (selectedGroup.id === "g2")
                        return u.department === "営業部";
                      if (selectedGroup.id === "g3")
                        return u.department === "経理部";
                      if (selectedGroup.id === "g4")
                        return u.department === "情報システム部";
                      return false;
                    }).map((user) => (
                      <div
                        key={user.id}
                        className="border-b-border-subtle grid grid-cols-[1fr_180px_100px] items-center gap-3 border-b px-5 py-3 text-xs transition-colors hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="bg-bg-active text-text-secondary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-text-primary font-medium">
                            {user.name}
                          </span>
                        </div>
                        <span className="text-text-muted font-mono text-[11px]">
                          {user.email}
                        </span>
                        <span className="text-text-secondary">{user.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCP権限タブ */}
              {activeTab === "tools" && (
                <div className="space-y-3">
                  <p className="text-text-secondary text-xs">
                    このグループが利用できるMCPサーバーを選択してください
                  </p>
                  <div className="space-y-2">
                    {TOOLS.map((tool) => {
                      const allowed = (
                        allowedToolsMap[selectedGroup.id] ?? []
                      ).includes(tool.id);
                      return (
                        <div
                          key={tool.id}
                          className="bg-bg-card border-border-default flex items-center gap-3 rounded-xl border px-4 py-3"
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                            style={{ backgroundColor: tool.color }}
                          >
                            {tool.name.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="flex-1">
                            <div className="text-text-primary text-xs font-medium">
                              {tool.name}
                            </div>
                            <div className="text-text-muted text-[10px]">
                              {tool.description}
                            </div>
                          </div>
                          {/* トグルスイッチ */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={allowed}
                            aria-label={`${tool.name} を${allowed ? "無効化" : "有効化"}`}
                            onClick={() =>
                              toggleTool(selectedGroup.id, tool.id)
                            }
                            className={`h-4 w-7 rounded-full transition-colors ${allowed ? "bg-badge-success-bg" : "bg-bg-active"}`}
                          >
                            <span
                              className={`block h-3 w-3 rounded-full transition-transform ${allowed ? "bg-badge-success-text translate-x-3.5" : "bg-text-subtle translate-x-0.5"}`}
                            />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* IdP連携タブ */}
              {activeTab === "idp" && (
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
                        value={idpGroupMap[selectedGroup.id] ?? ""}
                        onChange={(e) =>
                          setIdpGroupMap((prev) => ({
                            ...prev,
                            [selectedGroup.id]: e.target.value,
                          }))
                        }
                        className="bg-bg-app border-border-default text-text-secondary flex-1 rounded-lg border px-3 py-2 text-xs outline-none"
                      />
                      <button
                        type="button"
                        className="bg-btn-primary-bg text-btn-primary-text rounded-lg px-3 py-2 text-xs font-medium transition-opacity hover:opacity-80"
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
                        className="bg-bg-active text-text-secondary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                      >
                        <RefreshCw size={11} />
                        手動同期
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const cfg =
                          SYNC_STATUS_CONFIG[selectedGroup.syncStatus];
                        return (
                          <>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}
                            >
                              {cfg.label}
                            </span>
                            {selectedGroup.lastSync && (
                              <span className="text-text-muted font-mono text-[11px]">
                                最終同期: {selectedGroup.lastSync}
                              </span>
                            )}
                            {!selectedGroup.lastSync && (
                              <span className="text-text-muted text-[11px]">
                                まだ同期されていません
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 同期履歴テーブル */}
                  <div className="bg-bg-card border-border-default overflow-hidden rounded-xl border">
                    <div className="border-b-border-default px-4 py-3">
                      <h2 className="text-text-primary text-xs font-semibold">
                        同期履歴
                      </h2>
                    </div>
                    <div className="border-b-border-default text-text-subtle grid grid-cols-[160px_80px_80px_50px_50px_50px_1fr] items-center gap-3 border-b px-4 py-2 text-[10px]">
                      <span>日時</span>
                      <span>トリガー</span>
                      <span>ステータス</span>
                      <span className="text-right">追加</span>
                      <span className="text-right">削除</span>
                      <span className="text-right">エラー</span>
                      <span>詳細</span>
                    </div>
                    {SYNC_HISTORY.map((h) => {
                      const hCfg = HISTORY_STATUS_CONFIG[h.status];
                      return (
                        <div
                          key={h.id}
                          className="border-b-border-subtle grid grid-cols-[160px_80px_80px_50px_50px_50px_1fr] items-start gap-3 border-b px-4 py-3 text-xs transition-colors hover:bg-white/[0.02]"
                        >
                          <span className="text-text-muted font-mono text-[11px]">
                            {h.datetime}
                          </span>
                          <span className="bg-bg-active text-text-muted rounded px-2 py-0.5 text-center text-[10px]">
                            {TRIGGER_LABEL[h.trigger]}
                          </span>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-center text-[10px] font-medium ${hCfg.bg} ${hCfg.text}`}
                          >
                            {hCfg.label}
                          </span>
                          <span className="text-text-secondary text-right font-mono">
                            +{h.added}
                          </span>
                          <span className="text-text-secondary text-right font-mono">
                            -{h.removed}
                          </span>
                          <span
                            className={`text-right font-mono ${h.errors > 0 ? "text-red-400" : "text-text-secondary"}`}
                          >
                            {h.errors}
                          </span>
                          <span className="text-text-muted text-[10px]">
                            {h.detail ?? "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminGroupsPage;
