"use client";

import { useDraggable } from "@dnd-kit/core";
import { Wrench, X, Plus, Server } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { SelectableMcp } from "./types";

type McpCardProps = {
  mcp: SelectableMcp;
  isSelected: boolean;
  onToggle: () => void;
  isDragDisabled?: boolean;
};

export const McpCard = ({
  mcp,
  isSelected,
  onToggle,
  isDragDisabled = false,
}: McpCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: mcp.id,
      disabled: isDragDisabled,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 9999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative flex cursor-grab touch-none items-center gap-3 rounded-lg border bg-white p-3 transition-shadow active:cursor-grabbing",
        isSelected
          ? "border-purple-300 bg-purple-50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
        isDragDisabled && "cursor-default",
        // ドラッグ中はシャドウを追加
        isDragging && "shadow-xl ring-2 ring-purple-400",
      )}
    >
      {/* MCP アイコン */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
        {mcp.iconPath ? (
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

      {/* MCP 情報 */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{mcp.name}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Wrench className="h-3 w-3" />
          <span>{mcp.toolCount}ツール</span>
        </div>
      </div>

      {/* アクションボタン - ドラッグイベントを伝播させない */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onPointerDown={(e) => e.stopPropagation()}
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
