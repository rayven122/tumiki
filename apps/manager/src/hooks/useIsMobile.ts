"use client";

import { useState, useEffect } from "react";

/**
 * モバイル端末かどうかを判定するカスタムフック
 * ウィンドウサイズの変更を監視し、指定のブレークポイント未満であればtrueを返す
 *
 * @param breakpoint - モバイルと判定するブレークポイント（デフォルト: 768px）
 * @returns モバイル端末の場合true
 */
export const useIsMobile = (breakpoint = 768): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);

    // 初期チェック
    checkMobile();

    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
};
