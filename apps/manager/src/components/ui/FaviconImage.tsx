"use client";

import { useState } from "react";
import Image from "next/image";
import { getFaviconUrlsFromUrl } from "@/lib/faviconUtils";

interface FaviconImageProps {
  /** MCPサーバーのURL（ファビコンを抽出するため） */
  url?: string | null;
  /** フォールバック表示用のReactNode */
  fallback: React.ReactNode;
  /** ファビコンのサイズ（デフォルト: 32） */
  size?: number;
  /** 画像のalt属性 */
  alt: string;
  /** 追加のCSSクラス */
  className?: string;
}

export const FaviconImage = ({
  url,
  fallback,
  size = 32,
  alt,
  className = "",
}: FaviconImageProps) => {
  const [currentFaviconIndex, setCurrentFaviconIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // URLが存在しない場合は即座にフォールバックを表示
  if (!url) {
    return <>{fallback}</>;
  }

  const faviconUrls = getFaviconUrlsFromUrl(url, size);

  // ファビコンURLが取得できない場合はフォールバックを表示
  if (faviconUrls.length === 0 || hasError) {
    return <>{fallback}</>;
  }

  const currentFaviconUrl = faviconUrls[currentFaviconIndex];

  // 現在のファビコンURLが存在しない場合はフォールバックを表示
  if (!currentFaviconUrl) {
    return <>{fallback}</>;
  }

  const handleError = () => {
    // 次のファビコンURLを試す
    const nextIndex = currentFaviconIndex + 1;
    if (nextIndex < faviconUrls.length) {
      setCurrentFaviconIndex(nextIndex);
    } else {
      // 全てのファビコンURLが失敗した場合はフォールバックを表示
      setHasError(true);
    }
  };

  return (
    <Image
      src={currentFaviconUrl}
      alt={alt}
      width={size}
      height={size}
      className={className}
      onError={handleError}
      // Next.jsのImage最適化とキャッシュ機能を活用
      unoptimized={false}
      // ファビコンは通常小さいので、priorityは設定しない
    />
  );
};
