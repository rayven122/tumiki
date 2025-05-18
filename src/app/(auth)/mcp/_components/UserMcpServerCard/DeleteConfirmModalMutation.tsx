import { type ComponentProps } from "react";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";

type DeleteConfirmModalMutationProps = Pick<
  ComponentProps<typeof DeleteConfirmModal>,
  "serverName" | "onOpenChange"
> & {
  userMcpServerId: string;
  onSuccess?: () => Promise<void> | void;
};

export const DeleteConfirmModalMutation = ({
  serverName,
  userMcpServerId,
  onSuccess,
  ...props
}: DeleteConfirmModalMutationProps) => {
  const { mutate: deleteUserMcpServer, isPending } =
    api.userMcpServer.delete.useMutation({
      onSuccess: async () => {
        await onSuccess?.();
        toast.success(`${serverName}のMCPサーバーを削除しました。`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const onDelete = () => {
    deleteUserMcpServer({ id: userMcpServerId });
  };

  return (
    <DeleteConfirmModal
      {...props}
      open
      serverName={serverName}
      onDelete={onDelete}
      isLoading={isPending}
    />
  );
};
