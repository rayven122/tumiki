import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useState } from "react";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";

type ImageEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialImageUrl: string;
  serverName: string;
  userMcpServerId: string;
};

export const ImageEditModal = ({
  open,
  onOpenChange,
  initialImageUrl,
  serverName,
  userMcpServerId,
}: ImageEditModalProps) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);

  // const {
  //   // mutate: updateUserMcpServer,
  //   isPending: isLoading,
  // } = api.userMcpServer.update.useMutation({
  //   onSuccess: () => {
  //     toast.success(`${serverName}の画像を更新しました。`);
  //   },
  //   onError: (error) => {
  //     toast.error(error.message);
  //   },
  // });

  const onUpdate = () => {
    toast.info("実装中");
    console.log(imageUrl, userMcpServerId);
    // updateUserMcpServer({ id: userMcpServerId, imageUrl: imageUrl });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>サーバー画像を編集</DialogTitle>
          <DialogDescription>
            サーバーのアイコン画像を変更します。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="imageUrl">画像URL</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="画像URLを入力"
            />
          </div>
          {imageUrl && (
            <div className="flex justify-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-md border">
                <Image
                  src={imageUrl || "/placeholder.svg"}
                  alt="プレビュー"
                  fill
                  className="object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg?height=96&width=96";
                  }}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          {/* <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button onClick={onUpdate} disabled={isLoading || !imageUrl.trim()}>
            {isLoading ? "更新中..." : "更新"}
          </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
