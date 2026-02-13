"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
import { X } from "lucide-react";

/**
 * 部署エッジのデータ型
 */
export type DepartmentEdgeData = {
  isRelatedToSelected?: boolean; // 選択部署に関連するエッジか
  onDelete?: (edgeId: string) => void; // 削除ハンドラ
};

/**
 * 部署エッジの型
 */
export type DepartmentEdgeType = Edge<DepartmentEdgeData>;

/**
 * 組織図の部署間エッジコンポーネント
 *
 * UI要件:
 * - 通常時: 濃いグレー（#374151）、4px - 組織構造を常に視認可能
 * - 選択部署関連: 青色（#2563eb）、5px - 選択時の強調
 * - 削除ボタン: 選択時のみ表示、赤い×ボタン
 */
export const DepartmentEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
  }: EdgeProps<DepartmentEdgeType>) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0, // 完全な直角線
    });

    const isRelatedToSelected = data?.isRelatedToSelected ?? false;

    return (
      <>
        {/* エッジのパス */}
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: isRelatedToSelected ? "#2563eb" : "#374151",
            strokeWidth: isRelatedToSelected ? 5 : 4,
          }}
        />

        {/* 削除ボタン（選択部署関連エッジのみ表示） */}
        {isRelatedToSelected && (
          <EdgeLabelRenderer>
            <button
              className="nodrag nopan absolute flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-500 bg-white shadow-lg hover:bg-red-50"
              style={{
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
              }}
              onClick={() => data?.onDelete?.(id)}
            >
              <X className="h-5 w-5 text-red-500" />
            </button>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);

DepartmentEdge.displayName = "DepartmentEdge";
