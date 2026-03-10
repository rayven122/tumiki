import { useState, useRef } from "react";
import { toast } from "@/lib/client/toast";
import type { ServerCardListRef } from "@/types/sort";

export const useSortModeManager = () => {
  const [isSortMode, setIsSortMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const serverCardListRef = useRef<ServerCardListRef>(null);

  const handleSortModeToggle = () => {
    if (isSortMode) {
      // ソートモード終了時
      const hasChanges = serverCardListRef.current?.hasChanges() ?? false;
      if (hasChanges) {
        // 変更がある場合のみ確認ダイアログを表示
        setShowConfirmDialog(true);
      } else {
        // 変更がない場合は直接通常モードに戻す
        setIsSortMode(false);
      }
    } else {
      // ソートモード開始
      setIsSortMode(true);
    }
  };

  const handleConfirmChanges = async () => {
    try {
      if (serverCardListRef.current) {
        const hasChanges = serverCardListRef.current.hasChanges();
        if (hasChanges) {
          await serverCardListRef.current.handleConfirmChanges();
          toast.success("並び順を保存しました");
        }
        // 変更がない場合はmutationを実行せずに終了のみ
      }
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setIsSortMode(false);
      setShowConfirmDialog(false);
    }
  };

  const handleCancelChanges = () => {
    if (serverCardListRef.current) {
      serverCardListRef.current.handleCancelChanges();
      toast.info("変更を破棄しました");
    }
    setIsSortMode(false);
    setShowConfirmDialog(false);
  };

  return {
    isSortMode,
    showConfirmDialog,
    serverCardListRef,
    handleSortModeToggle,
    handleConfirmChanges,
    handleCancelChanges,
  };
};
