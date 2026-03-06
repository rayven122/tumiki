import { Button } from "@tumiki/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { AlertTriangleIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import type { McpServerId } from "@/schema/ids";

type DeleteConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  serverInstanceId: McpServerId;
  onSuccess?: () => Promise<void> | void;
  isLoading?: boolean;
};

export const DeleteConfirmModal = ({
  open,
  onOpenChange,
  serverName,
  serverInstanceId,
  onSuccess,
  isLoading: customIsLoading,
}: DeleteConfirmModalProps) => {
  const { mutate: deleteServerInstance, isPending } =
    api.userMcpServer.delete.useMutation({
      onSuccess: async () => {
        toast.success(`${serverName}のMCPサーバーを削除しました。`);
        await onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteServerInstance({ id: serverInstanceId });
  };

  const isLoading = customIsLoading ?? isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <AlertTriangleIcon className="mr-2 h-5 w-5 text-red-500" />
            サーバーを削除
          </DialogTitle>
          <DialogDescription>
            {`"${serverName}" を削除してもよろしいですか？この操作は元に戻せません。`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
