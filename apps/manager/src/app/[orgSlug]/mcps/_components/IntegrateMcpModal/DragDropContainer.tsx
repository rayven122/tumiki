"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragOverEvent,
  pointerWithin,
} from "@dnd-kit/core";
import { Layers, Package } from "lucide-react";
import { useState } from "react";
import { McpCard } from "./McpCard";
import {
  type SelectableMcp,
  DROPPABLE_AVAILABLE,
  DROPPABLE_SELECTED,
} from "./types";
import { cn } from "@/lib/utils";

type DragDropContainerProps = {
  availableMcps: SelectableMcp[];
  selectedMcps: SelectableMcp[];
  onSelect: (mcpId: string) => void;
  onRemove: (mcpId: string) => void;
};

// ドロップゾーンコンポーネント
const DroppableZone = ({
  id,
  children,
  isEmpty,
  isOver,
  variant,
}: {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  variant: "available" | "selected";
}) => {
  const { setNodeRef } = useDroppable({ id });

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

  const ariaLabel =
    variant === "available"
      ? "利用可能なMCPリスト。ドラッグして統合リストに追加できます"
      : "統合するMCPリスト。2つ以上のMCPを追加してください";

  return (
    <div
      ref={setNodeRef}
      role="listbox"
      aria-label={ariaLabel}
      className={cn(baseStyles, variantStyles)}
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-400">
          {variant === "available" ? (
            "すべてのMCPが選択されています"
          ) : (
            <>
              <Layers className="h-8 w-8 text-purple-300" />
              <span>ここにドラッグ&ドロップ</span>
              <span>またはクリックで追加</span>
            </>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export const DragDropContainer = ({
  availableMcps,
  selectedMcps,
  onSelect,
  onRemove,
}: DragDropContainerProps) => {
  const [overDroppableId, setOverDroppableId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      if (overId === DROPPABLE_AVAILABLE) {
        setOverDroppableId(DROPPABLE_AVAILABLE);
      } else if (overId === DROPPABLE_SELECTED) {
        setOverDroppableId(DROPPABLE_SELECTED);
      } else {
        setOverDroppableId(null);
      }
    } else {
      setOverDroppableId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // 状態をリセット
    setOverDroppableId(null);

    if (!over) return;

    const draggedId = active.id as string;
    const overId = over.id as string;

    // ドラッグ元を判定
    const isFromAvailable = availableMcps.some((mcp) => mcp.id === draggedId);
    const isFromSelected = selectedMcps.some((mcp) => mcp.id === draggedId);

    // ドロップ先を判定
    const isToSelected = overId === DROPPABLE_SELECTED;
    const isToAvailable = overId === DROPPABLE_AVAILABLE;

    // 利用可能 → 統合する
    if (isFromAvailable && isToSelected) {
      onSelect(draggedId);
      return;
    }

    // 統合する → 利用可能
    if (isFromSelected && isToAvailable) {
      onRemove(draggedId);
    }
  };

  const handleDragCancel = () => {
    setOverDroppableId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* 左パネル: 利用可能なMCP */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">利用可能なMCP</h3>
            <span className="text-xs text-gray-400">
              ({availableMcps.length})
            </span>
          </div>
          <DroppableZone
            id={DROPPABLE_AVAILABLE}
            isEmpty={availableMcps.length === 0}
            isOver={overDroppableId === DROPPABLE_AVAILABLE}
            variant="available"
          >
            {availableMcps.map((mcp) => (
              <McpCard
                key={mcp.id}
                mcp={mcp}
                isSelected={false}
                onToggle={() => onSelect(mcp.id)}
              />
            ))}
          </DroppableZone>
        </div>

        {/* 右パネル: 統合するMCP */}
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-700">統合するMCP</h3>
            <span className="text-xs text-gray-400">
              ({selectedMcps.length}/2以上)
            </span>
          </div>
          <DroppableZone
            id={DROPPABLE_SELECTED}
            isEmpty={selectedMcps.length === 0}
            isOver={overDroppableId === DROPPABLE_SELECTED}
            variant="selected"
          >
            {selectedMcps.map((mcp) => (
              <McpCard
                key={mcp.id}
                mcp={mcp}
                isSelected={true}
                onToggle={() => onRemove(mcp.id)}
              />
            ))}
          </DroppableZone>
        </div>
      </div>
    </DndContext>
  );
};
