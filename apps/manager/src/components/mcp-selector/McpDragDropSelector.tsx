"use client";

import { Layers, Package, Server, Wrench } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useDrag } from "./useDrag";
import { McpCard } from "./McpCard";
import {
  type SelectableMcp,
  DROPPABLE_AVAILABLE,
  DROPPABLE_SELECTED,
} from "./types";

// 有効な画像URLかどうかをチェック
const isValidImageUrl = (path: string | null): path is string => {
  if (!path) return false;
  return (
    path.startsWith("/") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  );
};

type McpDragDropSelectorProps = {
  availableMcps: SelectableMcp[];
  selectedMcps: SelectableMcp[];
  onSelect: (mcpId: string) => void;
  onRemove: (mcpId: string) => void;
  // カスタマイズ用props
  availableLabel?: string;
  selectedLabel?: string;
  selectedCountLabel?: string;
  emptySelectedMessage?: React.ReactNode;
};

// ドラッグオーバーレイ用のカード
const DragOverlayCard = ({
  mcp,
  position,
}: {
  mcp: SelectableMcp;
  position: { x: number; y: number };
}) => {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[10000] flex w-[280px] cursor-grabbing items-center gap-3 rounded-lg border border-purple-400 bg-white p-3 shadow-2xl ring-2 ring-purple-400"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
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
    </div>,
    document.body,
  );
};

// ドロップゾーンコンポーネント
const DroppableZone = ({
  id,
  children,
  isEmpty,
  isOver,
  variant,
  emptyMessage,
  onRegister,
}: {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  variant: "available" | "selected";
  emptyMessage?: React.ReactNode;
  onRegister: (id: string, element: HTMLElement | null) => void;
}) => {
  const handleRef = useCallback(
    (element: HTMLDivElement | null) => {
      onRegister(id, element);
    },
    [id, onRegister],
  );

  const baseStyles =
    "flex min-h-[300px] max-h-[50vh] flex-col gap-2 overflow-y-auto rounded-lg border-2 border-dashed p-3 transition-colors";
  const variantStyles =
    variant === "available"
      ? cn(
          "border-gray-200 bg-gray-50",
          isOver && "border-gray-400 bg-gray-100",
        )
      : cn(
          "border-purple-200 bg-purple-50/50",
          isOver && "border-purple-400 bg-purple-100",
        );

  return (
    <div
      ref={handleRef}
      role="listbox"
      aria-label={
        variant === "available" ? "利用可能なMCPリスト" : "選択済みのMCPリスト"
      }
      className={cn(baseStyles, variantStyles)}
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-400">
          {variant === "available"
            ? "すべてのMCPが選択されています"
            : (emptyMessage ?? (
                <>
                  <Layers className="h-8 w-8 text-purple-300" />
                  <span>ここにドラッグ&ドロップ</span>
                  <span>またはクリックで追加</span>
                </>
              ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export const McpDragDropSelector = ({
  availableMcps,
  selectedMcps,
  onSelect,
  onRemove,
  availableLabel = "利用可能なMCP",
  selectedLabel = "選択済みのMCP",
  selectedCountLabel,
  emptySelectedMessage,
}: McpDragDropSelectorProps) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = useCallback(
    (itemId: string, dropZone: string | null) => {
      const isFromAvailable = availableMcps.some((mcp) => mcp.id === itemId);
      const isFromSelected = selectedMcps.some((mcp) => mcp.id === itemId);

      if (isFromAvailable && dropZone === DROPPABLE_SELECTED) {
        onSelect(itemId);
      } else if (isFromSelected && dropZone === DROPPABLE_AVAILABLE) {
        onRemove(itemId);
      }
    },
    [availableMcps, selectedMcps, onSelect, onRemove],
  );

  const { dragState, startDrag, registerDropZone, getHoveredDropZone } =
    useDrag({ onDragEnd: handleDragEnd });

  useEffect(() => {
    if (dragState.isDragging) {
      setHoveredZone(getHoveredDropZone());
    } else {
      setHoveredZone(null);
    }
  }, [dragState.isDragging, dragState.position, getHoveredDropZone]);

  const draggedMcp =
    dragState.itemId !== null
      ? (availableMcps.find((mcp) => mcp.id === dragState.itemId) ??
        selectedMcps.find((mcp) => mcp.id === dragState.itemId))
      : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">
              {availableLabel}
            </h3>
            <span className="text-xs text-gray-400">
              ({availableMcps.length})
            </span>
          </div>
          <DroppableZone
            id={DROPPABLE_AVAILABLE}
            isEmpty={availableMcps.length === 0}
            isOver={hoveredZone === DROPPABLE_AVAILABLE}
            variant="available"
            onRegister={registerDropZone}
          >
            {availableMcps.map((mcp) => (
              <McpCard
                key={mcp.id}
                mcp={mcp}
                isSelected={false}
                onToggle={() => onSelect(mcp.id)}
                isDragging={dragState.itemId === mcp.id}
                onDragStart={(e) => startDrag(mcp.id, e)}
              />
            ))}
          </DroppableZone>
        </div>

        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-700">
              {selectedLabel}
            </h3>
            <span className="text-xs text-gray-400">
              {selectedCountLabel ?? `(${selectedMcps.length})`}
            </span>
          </div>
          <DroppableZone
            id={DROPPABLE_SELECTED}
            isEmpty={selectedMcps.length === 0}
            isOver={hoveredZone === DROPPABLE_SELECTED}
            variant="selected"
            emptyMessage={emptySelectedMessage}
            onRegister={registerDropZone}
          >
            {selectedMcps.map((mcp) => (
              <McpCard
                key={mcp.id}
                mcp={mcp}
                isSelected={true}
                onToggle={() => onRemove(mcp.id)}
                isDragging={dragState.itemId === mcp.id}
                onDragStart={(e) => startDrag(mcp.id, e)}
              />
            ))}
          </DroppableZone>
        </div>
      </div>

      {mounted && draggedMcp && dragState.position && (
        <DragOverlayCard mcp={draggedMcp} position={dragState.position} />
      )}
    </>
  );
};
