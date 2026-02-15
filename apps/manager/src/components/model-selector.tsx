"use client";

import { Button } from "@/components/ui/chat/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/chat/dropdown-menu";
import { AUTO_MODEL_ID } from "@/features/chat/services/ai/auto-model-selector";
import { useModelSelector } from "@/hooks/useModelSelector";
import { cn } from "@/lib/utils";

import { CheckCircleFillIcon, ChevronDownIcon, SparklesIcon } from "./icons";
import type { SessionData } from "~/auth";

type ModelSelectorProps = {
  session: SessionData;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

/**
 * 2段階階層のモデルセレクター（フルサイズ版）
 *
 * - 「自動（推奨）」: タスクに応じて最適なモデルを自動選択
 * - プロバイダー別サブメニュー: 手動でモデルを選択
 */
export const ModelSelector = ({
  session: _,
  selectedModelId,
  onModelChange,
  className,
}: ModelSelectorProps & React.ComponentProps<typeof Button>) => {
  const {
    open,
    setOpen,
    optimisticModelId,
    groupedModels,
    selectedDisplayName,
    handleSelectModel,
    isAutoSelected,
  } = useModelSelector({ selectedModelId, onModelChange });

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
          data-testid="model-selector"
          variant="outline"
          className="md:h-[34px] md:px-2"
        >
          {isAutoSelected && <SparklesIcon size={14} />}
          {selectedDisplayName}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {/* 自動選択オプション */}
        <DropdownMenuItem
          data-testid="model-selector-auto"
          onSelect={() => handleSelectModel(AUTO_MODEL_ID)}
          data-active={isAutoSelected}
          className="group/item"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SparklesIcon size={16} />
              <div className="flex flex-col">
                <span className="font-medium">自動（推奨）</span>
                <span className="text-muted-foreground text-xs">
                  タスクに応じて最適化
                </span>
              </div>
            </div>
            <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
              <CheckCircleFillIcon />
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* プロバイダー別サブメニュー */}
        {groupedModels.map((group) => (
          <DropdownMenuSub key={group.provider}>
            <DropdownMenuSubTrigger
              data-testid={`model-selector-provider-${group.provider}`}
            >
              {group.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[300px]">
              {group.models.map((chatModel) => {
                const isSelected = chatModel.id === optimisticModelId;

                return (
                  <DropdownMenuItem
                    key={chatModel.id}
                    data-testid={`model-selector-item-${chatModel.id}`}
                    onSelect={() => handleSelectModel(chatModel.id)}
                    data-active={isSelected}
                    className="group/item"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span>{chatModel.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {chatModel.description}
                        </span>
                      </div>
                      <div className="text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                        <CheckCircleFillIcon />
                      </div>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
