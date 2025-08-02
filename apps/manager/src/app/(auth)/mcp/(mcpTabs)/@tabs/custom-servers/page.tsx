"use client";

import { CreateCustomServerButton } from "./_components/CreateCustomServerButton";
import { McpTabs } from "../_components/McpTabs";
import { ServerCardList } from "./ServerCardList";
import { SortConfirmDialog } from "./SortConfirmDialog";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, X } from "lucide-react";
import { toast } from "@/utils/client/toast";

export default function CustomServersPage() {
  const [isSortMode, setIsSortMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const serverCardListRef = useRef<{
    handleConfirmChanges: () => Promise<void>;
    handleCancelChanges: () => void;
    hasChanges: () => boolean;
  }>(null);

  const handleSortModeToggle = () => {
    if (isSortMode) {
      // ソートモード終了時は確認ダイアログを表示
      setShowConfirmDialog(true);
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

  const SortModeToggleButton = () => (
    <Button
      variant={isSortMode ? "destructive" : "outline"}
      size="sm"
      onClick={handleSortModeToggle}
      className="mr-2"
    >
      {isSortMode ? (
        <>
          <X className="mr-2 h-4 w-4" />
          並び替え終了
        </>
      ) : (
        <>
          <ArrowUpDown className="mr-2 h-4 w-4" />
          並び替え
        </>
      )}
    </Button>
  );

  return (
    <McpTabs
      activeTab="custom-servers"
      addButton={
        <div className="flex items-center">
          <SortModeToggleButton />
          <CreateCustomServerButton />
        </div>
      }
    >
      {isSortMode && (
        <div className="mb-4 rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-700">
            🔄 並び替えモード:
            カードをドラッグして順序を変更できます。他の操作は無効です。
          </p>
        </div>
      )}
      <ServerCardList
        isSortMode={isSortMode}
        onSortModeChange={setIsSortMode}
        ref={serverCardListRef}
      />
      <SortConfirmDialog
        open={showConfirmDialog}
        onConfirm={handleConfirmChanges}
        onCancel={handleCancelChanges}
        hasChanges={serverCardListRef.current?.hasChanges() ?? false}
      />
    </McpTabs>
  );
}
