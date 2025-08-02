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

type SortConfirmDialogProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  hasChanges: boolean;
};

export const SortConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  hasChanges,
}: SortConfirmDialogProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>並び替えを終了しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            {hasChanges ? (
              <>
                カードの順序を変更しました。
                <br />
                変更を保存しますか？それとも破棄しますか？
              </>
            ) : (
              "カードの順序は変更されていません。"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {hasChanges ? (
            <>
              <AlertDialogCancel onClick={onCancel}>
                変更を破棄
              </AlertDialogCancel>
              <AlertDialogAction onClick={onConfirm}>
                変更を保存
              </AlertDialogAction>
            </>
          ) : (
            <AlertDialogAction onClick={onConfirm}>
              終了
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};