"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { Button } from "@tumiki/ui/button";
import { AlertTriangle } from "lucide-react";

type DeleteApiKeyDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  apiKeyName: string;
  isActive: boolean;
  isDeleting: boolean;
};

export const DeleteApiKeyDialog = ({
  open,
  onOpenChange,
  onConfirm,
  apiKeyName,
  isActive,
  isDeleting,
}: DeleteApiKeyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>APIキーの削除</DialogTitle>
          <DialogDescription>
            このAPIキーを完全に削除しようとしています。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-sm font-medium">APIキー名</p>
            <p className="mt-1 font-mono text-sm text-gray-600">{apiKeyName}</p>
          </div>

          {isActive && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <strong className="font-semibold">警告</strong>
              </div>
              <p className="text-sm text-amber-800">
                削除したAPIキーは復元できません。このAPIキーを使用しているアプリケーションは動作しなくなります。
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
