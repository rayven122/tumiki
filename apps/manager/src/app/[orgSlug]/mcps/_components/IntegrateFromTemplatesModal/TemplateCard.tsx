"use client";

import { Wrench, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthTypeBadge } from "../ServerCard/ServerCardAuthTypeBadge";
import { EntityIcon } from "@/components/ui/EntityIcon";
import type { SelectableTemplate } from "./types";

type TemplateCardProps = {
  template: SelectableTemplate;
  isSelected: boolean;
  onToggle: () => void;
  isDragging?: boolean;
  onDragStart?: (event: React.PointerEvent) => void;
};

export const TemplateCard = ({
  template,
  isSelected,
  onToggle,
  isDragging = false,
  onDragStart,
}: TemplateCardProps) => {
  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    onDragStart?.(event);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className={cn(
        "group relative flex cursor-grab touch-none items-center gap-3 rounded-lg border bg-white p-3 transition-shadow select-none active:cursor-grabbing",
        isSelected
          ? "border-purple-300 bg-purple-50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        isDragging && "opacity-40",
      )}
    >
      <EntityIcon
        iconPath={template.iconPath}
        fallbackUrl={template.url}
        type="mcp"
        size="sm"
        alt={template.name}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-gray-900">{template.name}</p>
          <AuthTypeBadge authType={template.authType} />
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Wrench className="h-3 w-3" />
          <span>
            {template.toolCount > 0
              ? `${template.toolCount}ツール`
              : "認証後に表示"}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
          isSelected
            ? "bg-purple-600 text-white hover:bg-purple-700"
            : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600",
        )}
        aria-label={isSelected ? "削除" : "追加"}
      >
        {isSelected ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
};
