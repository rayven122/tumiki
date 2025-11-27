"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpDown, X } from "lucide-react";
import { useSortModeManager } from "@/hooks/useSortModeManager";
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

import { ServerCardList } from "./ServerCardList";

type McpsPageClientProps = {
  orgSlug: string;
};

export const McpsPageClient = ({ orgSlug }: McpsPageClientProps) => {
  const {
    isSortMode,
    showConfirmDialog,
    serverCardListRef,
    handleSortModeToggle,
    handleConfirmChanges,
    handleCancelChanges,
  } = useSortModeManager();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">MCPサーバー</h1>
        <div className="flex items-center gap-2">
          {/* 並び替えボタン */}
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
          <Link href={`/${orgSlug}/mcps/add`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              MCPサーバーを追加
            </Button>
          </Link>
        </div>
      </div>

      {/* 接続済みMCPサーバー一覧 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">接続済みMCPサーバー</h2>
        {/* 並び替えモード通知 */}
        {isSortMode && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              🔄 並び替えモード:
              カードをドラッグして順序を変更できます。他の操作は無効です。
            </p>
          </div>
        )}
        <ServerCardList isSortMode={isSortMode} ref={serverCardListRef} />
      </div>

      {/* 並び替え確認ダイアログ */}
      <AlertDialog open={showConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>並び替えを終了しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {serverCardListRef.current?.hasChanges() ? (
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
            {serverCardListRef.current?.hasChanges() ? (
              <>
                <AlertDialogCancel onClick={handleCancelChanges}>
                  変更を破棄
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmChanges}>
                  変更を保存
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction onClick={handleConfirmChanges}>
                終了
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
