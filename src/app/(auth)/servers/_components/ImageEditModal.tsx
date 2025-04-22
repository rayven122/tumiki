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

type ImageEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  onUpdate: () => Promise<void>;
  isLoading: boolean;
};

export const ImageEditModal = ({
  open,
  onOpenChange,
  imageUrl,
  onImageUrlChange,
  onUpdate,
  isLoading,
}: ImageEditModalProps) => {
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
              onChange={(e) => onImageUrlChange(e.target.value)}
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            キャンセル
          </Button>
          <Button onClick={onUpdate} disabled={isLoading || !imageUrl.trim()}>
            {isLoading ? "更新中..." : "更新"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
