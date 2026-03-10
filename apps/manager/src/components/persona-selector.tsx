"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@tumiki/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@tumiki/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tumiki/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "~/trpc/react";

type PersonaSelectorProps = {
  selectedPersonaId?: string;
  onPersonaChange?: (id: string | undefined) => void;
  disabled?: boolean;
  className?: string;
};

const DEFAULT_ICON = "🤖";

// アイコンが画像パスか絵文字かを判定
const isImagePath = (icon: string) => icon.startsWith("/");

// ペルソナアイコンを描画
const PersonaIcon = ({
  icon,
  size = 20,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) => {
  if (isImagePath(icon)) {
    return (
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return <span className={cn("leading-none", className)}>{icon}</span>;
};

export const PersonaSelector = ({
  selectedPersonaId,
  onPersonaChange,
  disabled = false,
  className,
}: PersonaSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { data: personas } = api.chat.listPersonas.useQuery();

  // 現在選択中のペルソナを検索
  const currentPersona = personas?.find(
    (p) => p.id === (selectedPersonaId ?? "default"),
  );
  const currentIcon = currentPersona?.icon ?? DEFAULT_ICON;

  // ペルソナが1つ以下なら表示しない
  if (!personas || personas.length <= 1) {
    return null;
  }

  if (disabled) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 cursor-not-allowed p-0 opacity-50",
              className,
            )}
            disabled
          >
            <PersonaIcon icon={currentIcon} size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          キャラクターは新規チャット作成時のみ変更できます
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="persona-selector"
          variant="ghost"
          size="sm"
          className={cn("h-8 w-8 p-0", className)}
        >
          <PersonaIcon icon={currentIcon} size={20} />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-52 p-1">
        <div
          id="persona-selector-label"
          className="text-muted-foreground px-2 py-1.5 text-xs font-medium"
        >
          キャラクター
        </div>
        <div
          role="listbox"
          aria-labelledby="persona-selector-label"
          className="space-y-0.5"
        >
          {personas.map((persona) => {
            const isSelected = (selectedPersonaId ?? "default") === persona.id;

            return (
              <button
                key={persona.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onPersonaChange?.(
                    persona.id === "default" ? undefined : persona.id,
                  );
                  setOpen(false);
                }}
                className={cn(
                  "hover:bg-accent focus:bg-accent flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors focus:outline-none",
                  isSelected && "bg-accent",
                )}
              >
                <PersonaIcon
                  icon={persona.icon ?? DEFAULT_ICON}
                  size={24}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{persona.name}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {persona.description}
                  </div>
                </div>
                {isSelected && (
                  <Check
                    className="text-primary h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};
