import { useState, type ComponentProps } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { NameEditModal } from "./NameEditModal";

type NameEditModalMutationProps = {
  initialName: string;
  userMcpServerId: string;
  onSuccess?: () => Promise<void> | void;
} & Pick<ComponentProps<typeof NameEditModal>, "onOpenChange">;

export const NameEditModalMutation = ({
  initialName,
  userMcpServerId,
  onSuccess,
  ...props
}: NameEditModalMutationProps) => {
  const [newName, setNewName] = useState(initialName);

  const { mutate: updateUserMcpServer, isPending } =
    api.userMcpServer.update.useMutation({
      onSuccess: async () => {
        await onSuccess?.();
        toast.success("サーバー名を更新しました。");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const onUpdate = () => {
    updateUserMcpServer({ id: userMcpServerId, name: newName });
  };

  return (
    <NameEditModal
      {...props}
      open
      name={newName}
      onNameChange={setNewName}
      onUpdate={onUpdate}
      isLoading={isPending}
    />
  );
};
