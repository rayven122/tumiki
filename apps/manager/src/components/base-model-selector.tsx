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

/** BaseModelSelectorのバリアント設定 */
type ModelSelectorVariant = "default" | "compact";

/** バリアント別の設定 */
const VARIANT_CONFIG = {
  default: {
    testIdPrefix: "model-selector",
    buttonVariant: "outline" as const,
    buttonClassName: "md:h-[34px] md:px-2",
    buttonSize: undefined,
    sparklesSize: 14,
    contentAlign: "start" as const,
    contentWidth: "min-w-[300px]",
    subContentWidth: "min-w-[300px]",
  },
  compact: {
    testIdPrefix: "compact-model-selector",
    buttonVariant: "ghost" as const,
    buttonClassName: "h-8 gap-1 px-2 text-xs",
    buttonSize: "sm" as const,
    sparklesSize: 12,
    contentAlign: "end" as const,
    contentWidth: "min-w-[280px]",
    subContentWidth: "min-w-[280px]",
  },
} as const;

type BaseModelSelectorProps = {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
  /** セレクターのバリアント */
  variant?: ModelSelectorVariant;
};

/**
 * 2段階階層のモデルセレクター（共通コンポーネント）
 *
 * - 「自動（推奨）」: タスクに応じて最適なモデルを自動選択
 * - プロバイダー別サブメニュー: 手動でモデルを選択
 */
export const BaseModelSelector = ({
  selectedModelId,
  onModelChange,
  className,
  variant = "default",
}: BaseModelSelectorProps) => {
  const {
    open,
    setOpen,
    optimisticModelId,
    groupedModels,
    selectedDisplayName,
    handleSelectModel,
    isAutoSelected,
  } = useModelSelector({ selectedModelId, onModelChange });

  const config = VARIANT_CONFIG[variant];

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
          data-testid={config.testIdPrefix}
          variant={config.buttonVariant}
          size={config.buttonSize}
          className={config.buttonClassName}
        >
          {isAutoSelected && <SparklesIcon size={config.sparklesSize} />}
          {selectedDisplayName}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={config.contentAlign}
        className={config.contentWidth}
      >
        {/* 自動選択オプション */}
        <DropdownMenuItem
          data-testid={`${config.testIdPrefix}-auto`}
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
              data-testid={`${config.testIdPrefix}-provider-${group.provider}`}
            >
              {group.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={config.subContentWidth}>
              {group.models.map((chatModel) => {
                const isSelected = chatModel.id === optimisticModelId;

                return (
                  <DropdownMenuItem
                    key={chatModel.id}
                    data-testid={`${config.testIdPrefix}-item-${chatModel.id}`}
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
