"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type MoveOperation = {
  groupId: string;
  groupName: string;
  oldParentId: string;
  oldParentName: string;
  newParentId: string;
  newParentName: string;
};

type MoveConfirmDialogProps = {
  open: boolean;
  moves: MoveOperation[];
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 部署移動確認ダイアログ
 *
 * - movesが空でない場合に表示
 * - 移動内容を一覧表示
 * - 確認後にKeycloakへの変更を実行
 */
export const MoveConfirmDialog = ({
  open,
  moves,
  isLoading,
  onConfirm,
  onCancel,
}: MoveConfirmDialogProps) => {
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isLoading) {
      onCancel();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>組織構造の変更を保存しますか？</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>以下の部署の親部署が変更されます：</p>
              <ul className="list-inside list-disc space-y-2">
                {moves.map((move) => (
                  <li key={move.groupId} className="text-sm">
                    <span className="font-medium">{move.groupName}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      : {move.oldParentName} → {move.newParentName}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="text-amber-600">
                この操作は組織のグループ構造を変更します。
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>キャンセル</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "保存中..." : "保存する"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
