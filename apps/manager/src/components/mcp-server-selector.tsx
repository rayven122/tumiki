"use client";

import { useState } from "react";
import { Button } from "@tumiki/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@tumiki/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon, RouteIcon } from "./icons";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  countEnabledTools,
  countTotalToolsForSelectedServers,
  getServerIconPath,
} from "@/features/mcps/utils/mcpServerUtils";

type OfficialServer = RouterOutputs["userMcpServer"]["findMcpServers"][number];

type McpServerSelectorProps = {
  selectedMcpServerIds: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
  disabled?: boolean;
};

// MCPサーバー複数選択コンポーネント（Controlled Component）
export const McpServerSelector = ({
  selectedMcpServerIds,
  onSelectionChange,
  className,
  disabled = false,
}: McpServerSelectorProps) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
  };

  const { data: mcpServers, isLoading } =
    api.userMcpServer.findMcpServers.useQuery();

  const availableServers: OfficialServer[] =
    mcpServers?.filter(
      (server): server is OfficialServer => server.serverStatus === "RUNNING",
    ) ?? [];

  // 利用可能なサーバーに存在するIDのみをカウント
  const validSelectedIds = selectedMcpServerIds.filter((id) =>
    availableServers.some((server) => server.id === id),
  );
  const selectedCount = validSelectedIds.length;

  const totalToolsCount = countTotalToolsForSelectedServers(
    availableServers,
    selectedMcpServerIds,
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
          {selectedCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-medium">
              {selectedCount}
            </span>
          )}
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

            <div className="max-h-[280px] overflow-y-auto">
              {availableServers.map((server) => {
                const isSelected = selectedMcpServerIds.includes(server.id);
                const enabledToolsCount = countEnabledTools(server);
                const iconPath = getServerIconPath(server);

                return (
                  <DropdownMenuItem
                    data-testid={`mcp-server-selector-item-${server.id}`}
                    key={server.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleToggleServer(server.id);
                    }}
                    className={cn(
                      "group/item flex min-h-[48px] cursor-pointer flex-row items-center justify-between gap-3 px-3 py-2",
                      isSelected && "bg-accent/50",
                    )}
                    data-active={isSelected}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded">
                        {iconPath ? (
                          <img
                            src={iconPath}
                            alt=""
                            className="h-5 w-5 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <RouteIcon size={16} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
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
                  </DropdownMenuItem>
                );
              })}
            </div>

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
