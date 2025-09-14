import { useCallback } from "react";
import { toast } from "sonner";

type UseNotificationActionsProps = {
  onOpenChange?: (open: boolean) => void;
};

export const useNotificationActions = ({
  onOpenChange,
}: UseNotificationActionsProps) => {
  const handleAction = useCallback(
    async (action: () => void | Promise<void>, closeModal = false) => {
      try {
        await action();
        if (closeModal && onOpenChange) {
          onOpenChange(false);
        }
      } catch (error) {
        console.error("Action execution failed:", error);
        toast.error("アクションの実行に失敗しました。再度お試しください。");
      }
    },
    [onOpenChange],
  );

  const handleMarkAsRead = useCallback(
    (id: string, onMarkAsRead?: (id: string) => void, closeModal = true) => {
      if (onMarkAsRead) {
        onMarkAsRead(id);
        if (closeModal && onOpenChange) {
          onOpenChange(false);
        }
      }
    },
    [onOpenChange],
  );

  const handleDelete = useCallback(
    (id: string, onDelete?: (id: string) => void, closeModal = true) => {
      if (onDelete) {
        onDelete(id);
        if (closeModal && onOpenChange) {
          onOpenChange(false);
        }
      }
    },
    [onOpenChange],
  );

  return {
    handleAction,
    handleMarkAsRead,
    handleDelete,
  };
};
