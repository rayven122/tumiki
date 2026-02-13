"use client";

import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { type Department } from "@/features/org-structure/utils/mock/mockOrgData";
import type { DepartmentEdgeType } from "@/features/org-structure/components/edges/DepartmentEdge";

type ChangeParentDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  targetDepartment: Department | null;
  departments: Department[];
  edges: DepartmentEdgeType[];
  onChangeParent: (targetId: string, newParentId: string) => void;
};

/**
 * 親部署変更ダイアログ
 *
 * - 選択されたノードの親部署を変更するためのダイアログ
 * - 自分自身や子孫を親として選択できないようにする
 * - ルートノードは親として選択可能
 */
export const ChangeParentDialog = ({
  isOpen,
  onClose,
  targetDepartment,
  departments,
  edges,
  onChangeParent,
}: ChangeParentDialogProps) => {
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(
    undefined,
  );

  // 現在の親部署を取得
  const currentParentId = useMemo(() => {
    if (!targetDepartment) return null;
    const parentEdge = edges.find(
      (edge) => edge.target === targetDepartment.id,
    );
    return parentEdge?.source ?? null;
  }, [targetDepartment, edges]);

  const currentParent = useMemo(() => {
    if (!currentParentId) return null;
    return departments.find((d) => d.id === currentParentId) ?? null;
  }, [currentParentId, departments]);

  // 選択可能な親部署リスト（自分自身と子孫を除外）
  const selectableParents = useMemo(() => {
    if (!targetDepartment) return [];

    // 子孫ノードのIDを取得する関数
    const getDescendantIds = (nodeId: string): Set<string> => {
      const descendants = new Set<string>();

      const collectDescendants = (id: string) => {
        // このノードの子を探す
        const children = edges.filter((edge) => edge.source === id);
        for (const child of children) {
          descendants.add(child.target);
          collectDescendants(child.target);
        }
      };

      collectDescendants(nodeId);
      return descendants;
    };

    const descendantIds = getDescendantIds(targetDepartment.id);

    return departments.filter((dept) => {
      // 自分自身は選択不可
      if (dept.id === targetDepartment.id) return false;
      // 自分の子孫は選択不可
      if (descendantIds.has(dept.id)) return false;
      // 現在の親も除外（変更がないため）
      if (dept.id === currentParentId) return false;
      return true;
    });
  }, [targetDepartment, departments, edges, currentParentId]);

  // ダイアログを閉じる時に状態をリセット
  const handleClose = () => {
    setSelectedParentId(undefined);
    onClose();
  };

  // 親部署を変更
  const handleSubmit = () => {
    if (!targetDepartment || !selectedParentId) return;
    onChangeParent(targetDepartment.id, selectedParentId);
    handleClose();
  };

  if (!targetDepartment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>親部署を変更</DialogTitle>
          <DialogDescription>
            「{targetDepartment.name}」の新しい親部署を選択してください
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現在の親部署表示 */}
          <div>
            <Label className="text-muted-foreground text-sm">
              現在の親部署
            </Label>
            <div className="bg-muted mt-1 rounded-md p-3">
              <span className="font-medium">
                {currentParent?.name ?? "（なし）"}
              </span>
            </div>
          </div>

          {/* 矢印 */}
          <div className="flex justify-center">
            <ArrowRight className="text-muted-foreground h-6 w-6 rotate-90" />
          </div>

          {/* 新しい親部署選択 */}
          <div>
            <Label htmlFor="new-parent">新しい親部署</Label>
            <Select
              value={selectedParentId}
              onValueChange={setSelectedParentId}
            >
              <SelectTrigger id="new-parent" className="mt-1">
                <SelectValue placeholder="親部署を選択..." />
              </SelectTrigger>
              <SelectContent>
                {selectableParents.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                    {dept.isRoot && " (ルート)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectableParents.length === 0 && (
              <p className="text-muted-foreground mt-2 text-sm">
                選択可能な親部署がありません
              </p>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              キャンセル
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedParentId}>
              変更する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
