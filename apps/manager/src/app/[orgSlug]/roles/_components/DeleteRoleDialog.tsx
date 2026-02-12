"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import type { ListRolesOutput } from "@/features/roles/api/list";

type DeleteRoleDialogProps = {
  role: ListRolesOutput[number];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const DeleteRoleDialog = ({
  role,
  open,
  onOpenChange,
}: DeleteRoleDialogProps) => {
  const utils = api.useUtils();

  const deleteMutation = api.v2.role.delete.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      void utils.v2.role.list.invalidate();
      toast.success("ロールを削除しました");
    },
    onError: (error) => {
      if (error.data?.code === "FORBIDDEN") {
        toast.error("ロールを削除する権限がありません");
      } else if (error.data?.code === "NOT_FOUND") {
        toast.error("指定されたロールが見つかりません");
      } else {
        toast.error(`ロールの削除に失敗しました: ${error.message}`);
      }
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ slug: role.slug });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>ロール「{role.name}」を削除</AlertDialogTitle>
          <AlertDialogDescription>
            このロールを削除すると、Keycloakから完全に削除されます。
            <br />
            この操作は取り消せません。本当に削除しますか？
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "削除中..." : "削除"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
