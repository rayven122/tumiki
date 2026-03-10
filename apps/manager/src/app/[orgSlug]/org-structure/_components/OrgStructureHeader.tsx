"use client";

import { useMemo } from "react";
import { Button } from "@tumiki/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { Save, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { detectOrphanedDepartments } from "@/features/org-structure/utils/validation";
import type { DepartmentNodeType } from "@/features/org-structure/components/nodes/DepartmentNode";
import type { DepartmentEdgeType } from "@/features/org-structure/components/edges/DepartmentEdge";

type OrgStructureHeaderProps = {
  nodes: DepartmentNodeType[];
  edges: DepartmentEdgeType[];
  onArrangeNodes: () => void;
};

/**
 * 組織構造編集ページのヘッダーコンポーネント（コンパクト版）
 *
 * 機能:
 * - 保存ボタン（バリデーション結果に基づく有効/無効制御）
 * - 孤立部署ありの場合: ボタン無効化 + Tooltip表示
 * - 保存成功時: トースト通知
 */
export const OrgStructureHeader = ({
  nodes,
  edges,
  onArrangeNodes,
}: OrgStructureHeaderProps) => {
  // FR-5.2: 保存ボタンの状態制御
  const hasOrphanedDepartments = useMemo(() => {
    return detectOrphanedDepartments(nodes, edges);
  }, [nodes, edges]);

  /**
   * FR-6.1, FR-6.2: 保存処理
   */
  const handleSave = () => {
    // FR-5.3: 保存時のバリデーション
    if (hasOrphanedDepartments) {
      toast.error("全ての部署に親部署を設定してください");
      return;
    }

    // TODO: tRPC経由でKeycloak APIに保存
    toast.success("組織構造を保存しました");
  };

  return (
    <header className="bg-background border-b px-4 py-1.5">
      <div className="flex items-center justify-between gap-4">
        {/* 見出し */}
        <h1 className="text-sm font-semibold">組織構造</h1>

        {/* ボタングループ */}
        <div className="flex items-center gap-2">
          {/* レイアウト調整ボタン */}
          <Button
            onClick={onArrangeNodes}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-xs"
          >
            <ArrowDownUp className="h-3.5 w-3.5" />
            レイアウト調整
          </Button>

          {/* 保存ボタン */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleSave}
                    disabled={hasOrphanedDepartments}
                    size="sm"
                    className="h-8 gap-1.5 px-2.5 text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存
                  </Button>
                </span>
              </TooltipTrigger>
              {hasOrphanedDepartments && (
                <TooltipContent>
                  <p>全ての部署に親部署を設定してください</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </header>
  );
};
