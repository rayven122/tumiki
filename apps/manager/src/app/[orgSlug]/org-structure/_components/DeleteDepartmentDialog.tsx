"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Department } from "./mock/mockOrgData";

type DeleteDepartmentDialogProps = {
  organizationId: string;
  selectedDepartment: Department | null;
};

/**
 * 部署削除確認ダイアログ
 *
 * - 選択された部署を削除する
 * - ルート部署は削除できない
 * - 確認ダイアログで削除を確認
 */
export const DeleteDepartmentDialog = ({
  organizationId,
  selectedDepartment,
}: DeleteDepartmentDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const utils = api.useUtils();

  const deleteMutation = api.v2.group.delete.useMutation({
    onSuccess: () => {
      setIsOpen(false);
      void utils.v2.group.list.invalidate();
      void utils.v2.group.getMembers.invalidate();
      toast.success("部署を削除しました");
    },
    onError: (error) => {
      if (error.data?.code === "FORBIDDEN") {
        toast.error("部署を削除する権限がありません");
      } else if (error.data?.code === "NOT_FOUND") {
        toast.error("指定された部署が見つかりません");
      } else if (error.data?.code === "BAD_REQUEST") {
        toast.error("子部署が存在するため削除できません");
      } else {
        toast.error("部署の削除に失敗しました");
      }
    },
  });

  const handleDelete = () => {
    if (selectedDepartment && !selectedDepartment.isRoot) {
      deleteMutation.mutate({
        organizationId,
        groupId: selectedDepartment.id,
      });
    }
  };

  // ボタンの無効状態
  const isDisabled =
    !selectedDepartment ||
    selectedDepartment.isRoot ||
    deleteMutation.isPending;

  // ルートノードが選択されている場合のツールチップメッセージ
  const getTooltipMessage = () => {
    if (!selectedDepartment) return "削除する部署を選択してください";
    if (selectedDepartment.isRoot) return "ルート部署は削除できません";
    return null;
  };

  const tooltipMessage = getTooltipMessage();

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className="bg-background h-8 gap-1.5 px-2.5 text-xs shadow-md disabled:opacity-50"
          title={tooltipMessage ?? undefined}
        >
          <Trash2 className="h-3.5 w-3.5" />
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>部署を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{selectedDepartment?.name}
            」を削除します。この操作は取り消せません。
            {selectedDepartment && selectedDepartment.memberCount > 0 && (
              <span className="mt-2 block font-medium text-amber-600">
                この部署には {selectedDepartment.memberCount}{" "}
                人のメンバーが所属しています。
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
