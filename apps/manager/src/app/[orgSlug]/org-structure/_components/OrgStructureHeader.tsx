"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Save, ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { detectOrphanedDepartments } from "./utils/validation";
import type { DepartmentNodeType } from "./nodes/DepartmentNode";
import type { DepartmentEdgeType } from "./edges/DepartmentEdge";

type OrgStructureHeaderProps = {
  orgSlug: string;
  nodes: DepartmentNodeType[];
  edges: DepartmentEdgeType[];
  onArrangeNodes: () => void;
};

/**
 * 組織構造編集ページのヘッダーコンポーネント
 *
 * 機能:
 * - 保存ボタン（バリデーション結果に基づく有効/無効制御）
 * - 孤立部署ありの場合: ボタン無効化 + Tooltip表示
 * - 保存成功時: トースト通知
 */
export const OrgStructureHeader = ({
  orgSlug,
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
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">組織構造編集</h1>
          <p className="text-sm text-gray-500">{orgSlug}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* レイアウト調整ボタン */}
          <Button onClick={onArrangeNodes} variant="outline" className="gap-2">
            <ArrowDownUp className="h-4 w-4" />
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
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
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
