import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangleIcon } from "lucide-react";

type DeleteConfirmModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  onDelete: () => Promise<void> | void;
  isLoading: boolean;
};

export const DeleteConfirmModal = ({
  open,
  onOpenChange,
  serverName,
  onDelete,
  isLoading,
}: DeleteConfirmModalProps) => {
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
          <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
            {isLoading ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
