import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ApiKey } from "../types";

type DeleteApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentApiKey: ApiKey | null;
  onDeleteApiKey: (apiKeyId: string) => void;
};

export function DeleteApiKeyDialog({
  open,
  onOpenChange,
  currentApiKey,
  onDeleteApiKey,
}: DeleteApiKeyDialogProps) {
  const handleDeleteApiKey = () => {
    if (!currentApiKey) return;
    onDeleteApiKey(currentApiKey.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key削除</DialogTitle>
          <DialogDescription>
            このAPI Keyを削除してもよろしいですか？この操作は元に戻せません。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-muted-foreground mb-2 text-sm">
            以下のAPI Keyを削除します：
          </p>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="font-medium">{currentApiKey?.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              接続サーバー：
              {currentApiKey?.servers.map((server) => server.name).join(", ")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={handleDeleteApiKey}>
            削除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
