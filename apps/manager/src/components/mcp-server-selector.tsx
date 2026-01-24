"use client";

import { useState } from "react";
import { Button } from "@/components/ui/chat/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/chat/dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon, RouteIcon } from "./icons";
import { api, type RouterOutputs } from "~/trpc/react";

// クライアントサイドでCookieを保存（Server Actionを使わずに即時反映）
const saveMcpServerIdsToCookie = (mcpServerIds: string[]) => {
  document.cookie = `chat-mcp-servers=${encodeURIComponent(JSON.stringify(mcpServerIds))}; path=/; max-age=${60 * 60 * 24 * 365}`;
};

type OfficialServer =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"][number];

type McpServerSelectorProps = {
  selectedMcpServerIds: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
  /** 無効化フラグ（既存チャットでは途中変更不可） */
  disabled?: boolean;
};

/**
 * MCPサーバー複数選択コンポーネント
 *
 * UX心理学原則の適用:
 * - 認知負荷: サーバー一覧は必要な情報のみ表示、選択状態を視覚的に明確化
 * - 視覚的階層: 選択数バッジ、チェックアイコン、ツール数で優先順位を表現
 * - デフォルト効果: Cookie保存により前回の選択を維持
 * - タップターゲット: 各項目は44px以上の高さを確保
 * - ドハティの閾値: ローディング状態を明示
 * - 親近性バイアス: 他のセレクターと一貫したUIパターン
 * - 誘導抵抗: 全解除オプションで強制感を軽減
 */
export const McpServerSelector = ({
  selectedMcpServerIds: initialSelectedIds,
  onSelectionChange,
  className,
  disabled = false,
}: McpServerSelectorProps) => {
  const [open, setOpen] = useState(false);

  // 無効化時はドロップダウンを開かない
  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
  };
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds);

  // 組織内MCPサーバー一覧を取得
  const { data: mcpServers, isLoading } =
    api.v2.userMcpServer.findOfficialServers.useQuery();

  // 利用可能なサーバーのみフィルタ（削除済みでなく、RUNNINGのもの）
  const availableServers: OfficialServer[] =
    mcpServers?.filter(
      (server): server is OfficialServer => server.serverStatus === "RUNNING",
    ) ?? [];

  const selectedCount = selectedIds.length;

  // 選択されたサーバーの有効ツール総数を計算
  const totalToolsCount = availableServers
    .filter((server) => selectedIds.includes(server.id))
    .reduce(
      (total, server) =>
        total +
        server.templateInstances.reduce(
          (count, instance) =>
            count + instance.tools.filter((tool) => tool.isEnabled).length,
          0,
        ),
      0,
    );

  const handleToggleServer = (serverId: string) => {
    const isSelected = selectedIds.includes(serverId);
    const newSelectedIds = isSelected
      ? selectedIds.filter((id) => id !== serverId)
      : [...selectedIds, serverId];

    // クライアントサイドで即時更新（Server Actionを使わない）
    setSelectedIds(newSelectedIds);
    saveMcpServerIdsToCookie(newSelectedIds);

    // 親コンポーネントに選択変更を通知
    onSelectionChange?.(newSelectedIds);
  };

  const handleSelectAll = () => {
    const allIds = availableServers.map((server) => server.id);
    // クライアントサイドで即時更新
    setSelectedIds(allIds);
    saveMcpServerIdsToCookie(allIds);
    // 親コンポーネントに選択変更を通知
    onSelectionChange?.(allIds);
    // ユーザー歓喜: 全選択後もドロップダウンを開いたままにして確認感を与える
  };

  const handleClearAll = () => {
    // クライアントサイドで即時更新
    setSelectedIds([]);
    saveMcpServerIdsToCookie([]);
    // 親コンポーネントに選択変更を通知
    onSelectionChange?.([]);
    // 誘導抵抗: 強制感を与えないよう、いつでも解除可能
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit",
          className,
        )}
        disabled={disabled}
      >
        {/* タップターゲット: 最小44x44px以上を確保 */}
        <Button
          data-testid="mcp-server-selector"
          variant="outline"
          className={cn(
            "min-h-[44px] gap-1.5 md:h-[34px] md:min-h-0 md:px-2",
            disabled && "cursor-not-allowed",
          )}
          disabled={disabled}
        >
          <RouteIcon />
          <span className="hidden sm:inline">MCP</span>
          {/* 視覚的階層: 選択数をバッジで強調表示 */}
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-medium">
              {selectedCount}
            </span>
          )}
          {/* ツール数バッジ: 認知負荷軽減のため数のみ表示 */}
          {totalToolsCount > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-xs">
              {totalToolsCount}ツール
            </span>
          )}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="max-w-[320px] min-w-[280px]"
      >
        {/* ドハティの閾値: ローディング中はスケルトン的な表示 */}
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-10 animate-pulse rounded" />
            <div className="bg-muted h-10 animate-pulse rounded" />
          </div>
        ) : availableServers.length === 0 ? (
          // 誘導抵抗: 利用不可の場合も丁寧にガイド
          <div className="p-4 text-center">
            <div className="text-muted-foreground mb-2 text-sm">
              利用可能なMCPサーバーがありません
            </div>
            <div className="text-muted-foreground text-xs">
              サーバー設定から追加してください
            </div>
          </div>
        ) : (
          <>
            {/* 認知負荷軽減: 全選択/全解除で一括操作を可能に */}
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-muted-foreground text-xs font-medium">
                MCPサーバー ({availableServers.length})
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-primary hover:text-primary/80 min-h-[28px] px-2 text-xs transition-colors"
                >
                  全選択
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-muted-foreground hover:text-foreground min-h-[28px] px-2 text-xs transition-colors"
                >
                  解除
                </button>
              </div>
            </div>
            <DropdownMenuSeparator />

            {/* サーバー一覧: 認知負荷を軽減するため情報を整理 */}
            <div className="max-h-[280px] overflow-y-auto">
              {availableServers.map((server) => {
                const isSelected = selectedIds.includes(server.id);
                // 有効なツール数を計算（段階的開示: 詳細は必要時のみ）
                const enabledToolsCount = server.templateInstances.reduce(
                  (count, instance) =>
                    count +
                    instance.tools.filter((tool) => tool.isEnabled).length,
                  0,
                );

                // アイコンパス: McpServer.iconPath がなければ最初のテンプレートのアイコンを使用
                const iconPath =
                  server.iconPath ||
                  server.templateInstances[0]?.mcpServerTemplate?.iconPath;

                return (
                  <DropdownMenuItem
                    data-testid={`mcp-server-selector-item-${server.id}`}
                    key={server.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleToggleServer(server.id);
                    }}
                    // タップターゲット: 44px以上の高さを確保
                    className={cn(
                      "group/item flex min-h-[48px] cursor-pointer flex-row items-center justify-between gap-3 px-3 py-2",
                      // 視覚的階層: 選択状態を背景色で強調
                      isSelected && "bg-accent/50",
                    )}
                    data-active={isSelected}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* アイコン表示: 視覚的な識別を容易に */}
                      <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded">
                        {iconPath ? (
                          <img
                            src={iconPath}
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                        ) : (
                          <RouteIcon size={16} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        {/* サーバー名: 視覚的階層で最も目立たせる */}
                        <div className="truncate text-sm font-medium">
                          {server.name}
                        </div>
                        {/* ツール数: 段階的開示、詳細は設定画面で */}
                        <div className="text-muted-foreground text-xs">
                          {enabledToolsCount > 0
                            ? `${enabledToolsCount} ツール利用可能`
                            : "ツールなし"}
                        </div>
                      </div>
                    </div>
                    {/* チェックアイコン: 選択状態を明確に表示 */}
                    <div
                      className={cn(
                        "text-primary flex-shrink-0 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    >
                      <CheckCircleFillIcon />
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>

            {/* フッター: 選択状態のサマリーを表示（視覚的階層） */}
            {selectedCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="text-muted-foreground px-3 py-2 text-xs">
                  {selectedCount}個のサーバーを選択中
                </div>
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
