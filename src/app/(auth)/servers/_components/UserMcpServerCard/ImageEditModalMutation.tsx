import { useState, type ComponentProps } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { ImageEditModal } from "../ImageEditModal";

type ImageEditModalMutationProps = {
  initialImageUrl: string;
  serverName: string;
  userMcpServerId: string;
} & Pick<ComponentProps<typeof ImageEditModal>, "onOpenChange">;

export const ImageEditModalMutation = ({
  initialImageUrl,
  serverName,
  userMcpServerId,
  ...props
}: ImageEditModalMutationProps) => {
  const [newImageUrl, setNewImageUrl] = useState(initialImageUrl);

  const {
    // mutate: updateUserMcpServer,
    isPending,
  } = api.userMcpServer.update.useMutation({
    onSuccess: () => {
      toast.success(`${serverName}の画像を更新しました。`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onUpdate = () => {
    toast.info("実装中");
    console.log(newImageUrl, userMcpServerId);
    // updateUserMcpServer({ id: userMcpServerId, imageUrl: newImageUrl });
  };

  return (
    <ImageEditModal
      {...props}
      open
      imageUrl={newImageUrl}
      onImageUrlChange={setNewImageUrl}
      onUpdate={onUpdate}
      isLoading={isPending}
    />
  );
};
