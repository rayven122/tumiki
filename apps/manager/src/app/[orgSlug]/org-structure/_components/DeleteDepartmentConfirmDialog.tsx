"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { Department } from "@/features/org-structure/utils/mock/mockOrgData";

type DeleteDepartmentConfirmDialogProps = {
  organizationId: string;
  department: Department | null;
  onClose: () => void;
};

/**
 * 部署削除確認ダイアログ（制御型）
 *
 * - departmentがnullでない場合に表示
 * - 削除成功時にダイアログを閉じてデータを再取得
 */
export const DeleteDepartmentConfirmDialog = ({
  organizationId,
  department,
  onClose,
}: DeleteDepartmentConfirmDialogProps) => {
  const utils = api.useUtils();

  const deleteMutation = api.group.delete.useMutation({
    onSuccess: () => {
      onClose();
      void utils.group.list.invalidate();
      void utils.group.getMembers.invalidate();
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
    if (department) {
      deleteMutation.mutate({
        organizationId,
        groupId: department.id,
      });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !deleteMutation.isPending) {
      onClose();
    }
  };

  return (
    <AlertDialog open={department !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>部署を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{department?.name}」を削除します。この操作は取り消せません。
            {department && (department.memberCount ?? 0) > 0 && (
              <span className="mt-2 block font-medium text-amber-600">
                この部署には {department.memberCount}{" "}
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
