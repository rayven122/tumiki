"use client";

import { Wrench, X, Plus, Server } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SelectableMcp } from "./types";

// 有効な画像URLかどうかをチェック（lucide:XXXなどのアイコン参照は除外）
const isValidImageUrl = (path: string | null): path is string => {
  if (!path) return false;
  return (
    path.startsWith("/") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  );
};

type McpCardProps = {
  mcp: SelectableMcp;
  isSelected: boolean;
  onToggle: () => void;
  isDragging?: boolean;
  onDragStart?: (event: React.PointerEvent) => void;
};

export const McpCard = ({
  mcp,
  isSelected,
  onToggle,
  isDragging = false,
  onDragStart,
}: McpCardProps) => {
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        {isValidImageUrl(mcp.iconPath) ? (
          <Image
            src={mcp.iconPath}
            alt={mcp.name}
            width={32}
            height={32}
            className="rounded"
          />
        ) : (
          <Server className="h-5 w-5 text-gray-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{mcp.name}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Wrench className="h-3 w-3" />
          <span>{mcp.toolCount}ツール</span>
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
