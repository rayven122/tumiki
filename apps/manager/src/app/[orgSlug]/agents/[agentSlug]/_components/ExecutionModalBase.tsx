"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Maximize2 } from "lucide-react";
import { useSetAtom } from "jotai";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@tumiki/ui/dialog";
import { Button } from "@tumiki/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@tumiki/ui/tooltip";
import { sidebarOpenAtom } from "@/store/sidebar";

type ExecutionModalBaseProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** タイトルアイコン */
  titleIcon: ReactNode;
  /** タイトルテキスト */
  titleText: string;
  /** チャットページへのURL（全画面表示用） */
  chatPageUrl?: string | null;
  /** メタ情報（実行IDや実行時間など） */
  metadata?: ReactNode;
  /** モーダルのコンテンツ */
  children: ReactNode;
};

/**
 * 実行結果モーダルの共通ベースコンポーネント
 *
 * ExecutionHistoryModal と ExecutionResultModal の共通部分を抽出
 */
export const ExecutionModalBase = ({
  open,
  onOpenChange,
  titleIcon,
  titleText,
  chatPageUrl,
  metadata,
  children,
}: ExecutionModalBaseProps) => {
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);

  // 全画面表示リンククリック時にサイドバーを開く
  const handleFullscreenClick = () => {
    setSidebarOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] w-[80vw] max-w-[80vw] overflow-y-auto sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {titleIcon}
            {titleText}
            {chatPageUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-8 w-8"
                    asChild
                  >
                    <Link href={chatPageUrl} onClick={handleFullscreenClick}>
                      <Maximize2 className="h-4 w-4" />
                      <span className="sr-only">全画面で表示</span>
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>全画面で表示</TooltipContent>
              </Tooltip>
            )}
          </DialogTitle>
        </DialogHeader>

        {metadata && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {metadata}
          </div>
        )}

        <div className="space-y-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
};

/** エラー表示コンポーネント */
export const ExecutionErrorDisplay = ({ error }: { error: string }) => (
  <div className="rounded-lg bg-red-50 p-4">
    <p className="font-medium text-red-700">エラー</p>
    <p className="mt-1 text-sm text-red-600">{error}</p>
  </div>
);
