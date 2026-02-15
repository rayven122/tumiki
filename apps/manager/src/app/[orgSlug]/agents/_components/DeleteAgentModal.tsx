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
import type { AgentId } from "@/schema/ids";
import { api } from "@/trpc/react";
import { toast } from "sonner";

type DeleteAgentModalProps = {
  open: boolean;
  agentId: string;
  agentName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

/**
 * エージェント削除確認モーダル
 */
export const DeleteAgentModal = ({
  open,
  agentId,
  agentName,
  onOpenChange,
  onSuccess,
}: DeleteAgentModalProps) => {
  const deleteAgentMutation = api.agent.delete.useMutation({
    onSuccess: () => {
      toast.success("エージェントを削除しました");
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
    },
  });

  const handleDelete = () => {
    deleteAgentMutation.mutate({ id: agentId as AgentId });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>エージェントを削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{agentName}」を削除します。
            <br />
            関連するスケジュールと実行履歴も削除されます。
            <br />
            この操作は取り消せません。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAgentMutation.isPending}>
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteAgentMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteAgentMutation.isPending ? "削除中..." : "削除する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
