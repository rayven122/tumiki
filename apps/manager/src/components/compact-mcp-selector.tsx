"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/chat/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, RouteIcon } from "./icons";
import { api, type RouterOutputs } from "~/trpc/react";
import { useSetAtom } from "jotai";
import { mcpServerMapAtom, type McpServerInfo } from "@/atoms/mcpServerMapAtom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/chat/tooltip";

type OfficialServer =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"][number];

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
  const setMcpServerMap = useSetAtom(mcpServerMapAtom);

  const handleOpenChange = (newOpen: boolean) => {
    if (disabled) return;
    setOpen(newOpen);
  };

  const { data: mcpServers, isLoading } =
    api.v2.userMcpServer.findOfficialServers.useQuery();

  // MCPサーバー情報をatomに反映
  // 注: setMcpServerMapはJotaiのセッターで安定した参照を持つため依存配列から除外
  useEffect(() => {
    if (mcpServers) {
      const map: Record<string, McpServerInfo> = {};
      for (const server of mcpServers) {
        map[server.id] = {
          name: server.name,
          iconPath: server.iconPath ?? undefined,
        };
      }
      setMcpServerMap(map);
    }
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

  const totalToolsCount = availableServers
    .filter((server) => selectedMcpServerIds.includes(server.id))
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

            <div className="max-h-[280px] overflow-y-auto p-1">
              {availableServers.map((server) => {
                const isSelected = selectedMcpServerIds.includes(server.id);
                const enabledToolsCount = server.templateInstances.reduce(
                  (count, instance) =>
                    count +
                    instance.tools.filter((tool) => tool.isEnabled).length,
                  0,
                );
                const iconPath =
                  server.iconPath ||
                  server.templateInstances[0]?.mcpServerTemplate?.iconPath;

                return (
                  <button
                    type="button"
                    data-testid={`compact-mcp-selector-item-${server.id}`}
                    key={server.id}
                    onClick={() => handleToggleServer(server.id)}
                    className={cn(
                      "hover:bg-accent flex min-h-[48px] w-full cursor-pointer flex-row items-center justify-between gap-3 rounded-md px-3 py-2",
                      isSelected && "bg-accent/50",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
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
