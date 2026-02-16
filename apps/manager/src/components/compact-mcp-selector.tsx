"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@tumiki/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@tumiki/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tumiki/ui/tooltip";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, RouteIcon } from "./icons";
import { api, type RouterOutputs } from "~/trpc/react";
import { EntityIcon } from "@/features/shared/components/EntityIcon";
import {
  countEnabledTools,
  countTotalToolsForSelectedServers,
  getServerIconPath,
  getServerFallbackUrl,
} from "@/features/mcps/utils/mcpServerUtils";

type OfficialServer = RouterOutputs["userMcpServer"]["findMcpServers"][number];

type CompactMcpSelectorProps = {
  selectedMcpServerIds: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
  disabled?: boolean;
};

export const CompactMcpSelector = ({
  selectedMcpServerIds,
  onSelectionChange,
  className,
  disabled = false,
}: CompactMcpSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
  };

  const { data: mcpServers, isLoading } =
    api.userMcpServer.findMcpServers.useQuery();

  // 存在しないサーバーIDをクリーンアップ
  // localStorageに保存された古いIDが残っている場合、利用可能なサーバーが読み込まれた後に削除
  useEffect(() => {
    if (!mcpServers || mcpServers.length === 0) return;

    const availableIds = new Set(
      mcpServers
        .filter((server) => server.serverStatus === "RUNNING")
        .map((server) => server.id),
    );

    const validIds = selectedMcpServerIds.filter((id) => availableIds.has(id));

    // 無効なIDが含まれている場合のみ更新（無限ループ防止）
    if (validIds.length !== selectedMcpServerIds.length) {
      onSelectionChange?.(validIds);
    }
    // 依存配列: mcpServersの変更時のみ実行（選択変更時は実行しない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcpServers]);

  const availableServers: OfficialServer[] =
    mcpServers?.filter(
      (server): server is OfficialServer => server.serverStatus === "RUNNING",
    ) ?? [];

  // 利用可能なサーバーに存在するIDのみをカウント
  const validSelectedIds = selectedMcpServerIds.filter((id) =>
    availableServers.some((server) => server.id === id),
  );
  const selectedCount = validSelectedIds.length;

  // 選択されたサーバーのツール数を計算（メモ化で不要な再計算を防止）
  const totalToolsCount = useMemo(
    () =>
      countTotalToolsForSelectedServers(availableServers, selectedMcpServerIds),
    [availableServers, selectedMcpServerIds],
  );

  const handleToggleServer = (serverId: string) => {
    const isSelected = selectedMcpServerIds.includes(serverId);
    const newSelectedIds = isSelected
      ? selectedMcpServerIds.filter((id) => id !== serverId)
      : [...selectedMcpServerIds, serverId];
    onSelectionChange?.(newSelectedIds);
  };

  const handleSelectAll = () => {
    const allIds = availableServers.map((server) => server.id);
    onSelectionChange?.(allIds);
  };

  const handleClearAll = () => {
    onSelectionChange?.([]);
  };

  const buttonContent = (
    <Button
      data-testid="compact-mcp-selector"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 gap-1 px-2 text-xs",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      disabled={disabled}
    >
      <RouteIcon />
      <span className="hidden sm:inline">MCP</span>
      {selectedCount > 0 && (
        <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-[10px] font-medium">
          {selectedCount}
        </span>
      )}
      {totalToolsCount > 0 && (
        <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
          {totalToolsCount}
        </span>
      )}
    </Button>
  );

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="top">
          MCPサーバーは新規チャット作成時のみ変更できます
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{buttonContent}</PopoverTrigger>

      <PopoverContent align="start" className="max-w-[320px] min-w-[280px] p-0">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-10 animate-pulse rounded" />
            <div className="bg-muted h-10 animate-pulse rounded" />
          </div>
        ) : availableServers.length === 0 ? (
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
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span
                id="mcp-server-label"
                className="text-muted-foreground text-xs font-medium"
              >
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

            <div
              role="listbox"
              aria-labelledby="mcp-server-label"
              aria-multiselectable="true"
              className="max-h-[280px] overflow-y-auto p-1"
            >
              {availableServers.map((server) => {
                const isSelected = selectedMcpServerIds.includes(server.id);
                const enabledToolsCount = countEnabledTools(server);
                const iconPath = getServerIconPath(server);
                const fallbackUrl = getServerFallbackUrl(server);

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid={`compact-mcp-selector-item-${server.id}`}
                    key={server.id}
                    onClick={() => handleToggleServer(server.id)}
                    className={cn(
                      "hover:bg-accent focus:bg-accent flex min-h-[48px] w-full cursor-pointer flex-row items-center justify-between gap-3 rounded-md px-3 py-2 focus:outline-none",
                      isSelected && "bg-accent/50",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <EntityIcon
                        iconPath={iconPath}
                        fallbackUrl={fallbackUrl}
                        type="mcp"
                        size="sm"
                        alt={server.name}
                      />
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {server.name}
                          </span>
                          {server.dynamicSearch && (
                            <span className="bg-primary/10 text-primary flex-shrink-0 rounded px-1 py-0.5 text-[10px] font-medium">
                              動的
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {enabledToolsCount > 0
                            ? `${enabledToolsCount} ツール利用可能`
                            : "ツールなし"}
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-primary flex-shrink-0 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    >
                      <CheckCircleFillIcon />
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedCount > 0 && (
              <div className="text-muted-foreground border-t px-3 py-2 text-xs">
                {selectedCount}個のサーバーを選択中
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
