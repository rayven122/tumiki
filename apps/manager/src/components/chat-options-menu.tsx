"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Monitor, Star, Sparkles, ChevronDown, Check } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@tumiki/ui/popover";
import { cn } from "@/lib/utils";
import { useCoharuContext } from "@/features/avatar/hooks/useCoharuContext";

type DisplayMode = "normal" | "coharu" | "avatar";

type ModeConfig = {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ChatOptionsMenuProps = {
  chatId: string;
  orgSlug: string;
  isNewChat?: boolean;
  className?: string;
};

const MODE_CONFIG: Record<DisplayMode, ModeConfig> = {
  normal: {
    label: "通常モード",
    description: "テキストのみで会話",
    icon: Monitor,
  },
  coharu: {
    label: "coharu",
    description: "アバターを表示して会話",
    icon: Star,
  },
  avatar: {
    label: "アバターモード",
    description: "全画面でアバター表示",
    icon: Sparkles,
  },
};

export const ChatOptionsMenu = ({
  chatId,
  orgSlug,
  isNewChat = false,
  className,
}: ChatOptionsMenuProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { isEnabled: isCoharuEnabled, setIsEnabled: setCoharuEnabled } =
    useCoharuContext();

  // 現在のモードを判定
  const currentMode: DisplayMode = isCoharuEnabled ? "coharu" : "normal";
  const currentConfig = MODE_CONFIG[currentMode];
  const CurrentIcon = currentConfig.icon;

  // モード選択ハンドラ
  const handleModeSelect = (mode: DisplayMode) => {
    if (mode === "avatar") {
      // アバターモードへ移動
      setOpen(false);
      if (isNewChat) {
        router.push(`/${orgSlug}/avatar`);
      } else {
        router.push(`/${orgSlug}/avatar/${chatId}`);
      }
    } else if (mode === "coharu") {
      setCoharuEnabled(true);
      setOpen(false);
    } else {
      setCoharuEnabled(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="chat-options-menu"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1 px-2",
            isCoharuEnabled && "text-primary",
            className,
          )}
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden text-xs sm:inline">
            {currentConfig.label}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-1">
        <div
          id="display-mode-label"
          className="text-muted-foreground px-2 py-1.5 text-xs font-medium"
        >
          表示モード
        </div>
        <div
          role="listbox"
          aria-labelledby="display-mode-label"
          className="space-y-0.5"
        >
          {(Object.entries(MODE_CONFIG) as [DisplayMode, ModeConfig][]).map(
            ([mode, config]) => {
              const Icon = config.icon;
              const isSelected = mode === currentMode;
              const isAvatarMode = mode === "avatar";

              return (
                <button
                  key={mode}
                  type="button"
                  role="option"
                  aria-selected={isSelected && !isAvatarMode}
                  onClick={() => handleModeSelect(mode)}
                  className={cn(
                    "hover:bg-accent focus:bg-accent flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors focus:outline-none",
                    isSelected && !isAvatarMode && "bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{config.label}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {config.description}
                    </div>
                  </div>
                  {isSelected && !isAvatarMode && (
                    <Check
                      className="text-primary h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            },
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
