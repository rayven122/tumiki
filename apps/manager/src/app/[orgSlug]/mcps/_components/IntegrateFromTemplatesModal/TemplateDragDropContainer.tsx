"use client";

import { Layers, Package, Wrench } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { EntityIcon } from "@/components/ui/EntityIcon";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useDrag } from "@/features/mcps/components/mcp-selector";
import { TemplateCard } from "./TemplateCard";
import {
  type SelectableTemplate,
  DROPPABLE_AVAILABLE,
  DROPPABLE_SELECTED,
} from "./types";

type TemplateDragDropContainerProps = {
  availableTemplates: SelectableTemplate[];
  selectedTemplates: SelectableTemplate[];
  onSelect: (templateId: string) => void;
  onRemove: (templateId: string) => void;
};

// ドラッグオーバーレイ用のカード
const DragOverlayCard = ({
  template,
  position,
}: {
  template: SelectableTemplate;
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
      <EntityIcon
        iconPath={template.iconPath}
        fallbackUrl={template.url}
        type="mcp"
        size="sm"
        alt={template.name}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{template.name}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Wrench className="h-3 w-3" />
          <span>
            {template.toolCount > 0
              ? `${template.toolCount}ツール`
              : "認証後に表示"}
          </span>
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
  onRegister,
}: {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isOver: boolean;
  variant: "available" | "selected";
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
        variant === "available"
          ? "利用可能なテンプレートリスト。ドラッグして統合リストに追加できます"
          : "統合するテンプレートリスト。2つ以上のテンプレートを追加してください"
      }
      className={cn(baseStyles, variantStyles)}
    >
      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-400">
          {variant === "available" ? (
            "すべてのテンプレートが選択されています"
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

export const TemplateDragDropContainer = ({
  availableTemplates,
  selectedTemplates,
  onSelect,
  onRemove,
}: TemplateDragDropContainerProps) => {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDragEnd = useCallback(
    (itemId: string, dropZone: string | null) => {
      const isFromAvailable = availableTemplates.some((t) => t.id === itemId);
      const isFromSelected = selectedTemplates.some((t) => t.id === itemId);

      if (isFromAvailable && dropZone === DROPPABLE_SELECTED) {
        onSelect(itemId);
      } else if (isFromSelected && dropZone === DROPPABLE_AVAILABLE) {
        onRemove(itemId);
      }
    },
    [availableTemplates, selectedTemplates, onSelect, onRemove],
  );

  const { dragState, startDrag, registerDropZone, getHoveredDropZone } =
    useDrag({ onDragEnd: handleDragEnd });

  // getHoveredDropZoneは内部でdragState.positionを使用するため、
  // 依存配列から除外しても安全
  useEffect(() => {
    if (dragState.isDragging) {
      setHoveredZone(getHoveredDropZone());
    } else {
      setHoveredZone(null);
    }
  }, [dragState.isDragging, dragState.position, getHoveredDropZone]);

  const draggedTemplate =
    dragState.itemId !== null
      ? (availableTemplates.find((t) => t.id === dragState.itemId) ??
        selectedTemplates.find((t) => t.id === dragState.itemId))
      : null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <h3 className="text-sm font-medium text-gray-700">
              利用可能なテンプレート
            </h3>
            <span className="text-xs text-gray-400">
              ({availableTemplates.length})
            </span>
          </div>
          <DroppableZone
            id={DROPPABLE_AVAILABLE}
            isEmpty={availableTemplates.length === 0}
            isOver={hoveredZone === DROPPABLE_AVAILABLE}
            variant="available"
            onRegister={registerDropZone}
          >
            {availableTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={false}
                onToggle={() => onSelect(template.id)}
                isDragging={dragState.itemId === template.id}
                onDragStart={(e) => startDrag(template.id, e)}
              />
            ))}
          </DroppableZone>
        </div>

        <div className="flex flex-col">
          <div className="mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            <h3 className="text-sm font-medium text-gray-700">
              統合するテンプレート
            </h3>
            <span className="text-xs text-gray-400">
              ({selectedTemplates.length}/2以上)
            </span>
          </div>
          <DroppableZone
            id={DROPPABLE_SELECTED}
            isEmpty={selectedTemplates.length === 0}
            isOver={hoveredZone === DROPPABLE_SELECTED}
            variant="selected"
            onRegister={registerDropZone}
          >
            {selectedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={true}
                onToggle={() => onRemove(template.id)}
                isDragging={dragState.itemId === template.id}
                onDragStart={(e) => startDrag(template.id, e)}
              />
            ))}
          </DroppableZone>
        </div>
      </div>

      {mounted && draggedTemplate && dragState.position && (
        <DragOverlayCard
          template={draggedTemplate}
          position={dragState.position}
        />
      )}
    </>
  );
};
