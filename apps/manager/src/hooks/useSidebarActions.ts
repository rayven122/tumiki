"use client";

import { useCallback } from "react";

/**
 * サイドバー操作に関するカスタムフック
 * モバイル時のみサイドバーを閉じる処理を共通化
 *
 * @param isMobile - モバイル端末かどうか
 * @param setIsOpen - サイドバーの開閉状態を設定する関数
 * @returns サイドバー操作関数群
 */
export const useSidebarActions = (
  isMobile: boolean,
  setIsOpen: (open: boolean) => void,
) => {
  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [isMobile, setIsOpen]);

  return { closeSidebar };
};
