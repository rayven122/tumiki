"use client";

import { startTransition, useMemo, useOptimistic, useState } from "react";

import { Button } from "@/components/ui/chat/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/chat/dropdown-menu";
import {
  chatModels,
  DEFAULT_CHAT_MODEL,
  getModelsGroupedByProvider,
  entitlementsByUserType,
} from "@/features/chat/services/ai/index.client";
import { cn } from "@/lib/utils";

import { CheckCircleFillIcon, ChevronDownIcon } from "./icons";
import type { SessionData } from "~/auth";

type CompactModelSelectorProps = {
  session: SessionData;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

export const CompactModelSelector = ({
  session: _session, // 将来の権限ベースモデル制御用に保持
  selectedModelId,
  onModelChange,
  className,
}: CompactModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);

  const { availableChatModelIds } = entitlementsByUserType.regular;

  // プロバイダー別にグループ化されたモデル（利用可能なものだけフィルタ）
  const groupedModels = useMemo(() => {
    const groups = getModelsGroupedByProvider();
    return groups
      .map((group) => ({
        ...group,
        models: group.models.filter((model) =>
          availableChatModelIds.includes(model.id),
        ),
      }))
      .filter((group) => group.models.length > 0);
  }, [availableChatModelIds]);

  // 選択されたモデルを取得、見つからない場合はデフォルトモデルにフォールバック
  const selectedChatModel = useMemo(() => {
    const found = chatModels.find(
      (chatModel) =>
        chatModel.id === optimisticModelId &&
        availableChatModelIds.includes(chatModel.id),
    );
    if (found) return found;

    // フォールバック: デフォルトモデルを返す
    return chatModels.find((chatModel) => chatModel.id === DEFAULT_CHAT_MODEL);
  }, [optimisticModelId, availableChatModelIds]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground w-fit",
          className,
        )}
      >
        <Button
          data-testid="compact-model-selector"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs"
        >
          {selectedChatModel?.name}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[300px]">
        {groupedModels.map((group, groupIndex) => (
          <DropdownMenuGroup key={group.provider}>
            <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
              {group.label}
            </DropdownMenuLabel>
            {group.models.map((chatModel) => {
              const { id } = chatModel;

              return (
                <DropdownMenuItem
                  data-testid={`compact-model-selector-item-${id}`}
                  key={id}
                  onSelect={() => {
                    setOpen(false);

                    startTransition(() => {
                      setOptimisticModelId(id);
                      onModelChange?.(id);
                    });
                  }}
                  data-active={id === optimisticModelId}
                  asChild
                >
                  <button
                    type="button"
                    className="group/item flex w-full flex-row items-center justify-between gap-4"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div>{chatModel.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {chatModel.description}
                      </div>
                    </div>

                    <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                      <CheckCircleFillIcon />
                    </div>
                  </button>
                </DropdownMenuItem>
              );
            })}
            {/* 最後のグループ以外にはセパレーターを表示 */}
            {groupIndex < groupedModels.length - 1 && (
              <div className="bg-border my-1 h-px" />
            )}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
