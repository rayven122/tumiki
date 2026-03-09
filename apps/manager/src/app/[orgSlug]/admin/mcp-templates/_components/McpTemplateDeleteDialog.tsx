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
} from "@tumiki/ui/alert-dialog";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type McpTemplateDeleteDialogProps = {
  templateId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const McpTemplateDeleteDialog = ({
  templateId,
  open,
  onOpenChange,
}: McpTemplateDeleteDialogProps) => {
  const utils = api.useUtils();

  const { data: template } = api.mcpServerTemplate.get.useQuery(
    { id: templateId },
    { enabled: !!templateId },
  );

  const deleteMutation = api.mcpServerTemplate.delete.useMutation({
    onSuccess: async () => {
      toast.success("テンプレートを削除しました");
      await utils.mcpServerTemplate.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "テンプレートの削除に失敗しました");
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: templateId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
          <AlertDialogDescription>
            {template ? (
              <>
                <span className="font-medium">{template.name}</span>{" "}
                を削除しますか？
                <br />
                この操作は取り消せません。
              </>
            ) : (
              "このテンプレートを削除しますか？"
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
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
