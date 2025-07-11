"use client";

import { useState } from "react";
import Image from "next/image";

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

/**
 * URLからドメイン名を抽出する関数（クライアントサイド専用）
 * @param url - 抽出対象のURL
 * @returns ドメイン名またはnull（無効なURLの場合）
 */
const extractDomainFromUrl = (url: string): string | null => {
  try {
    // URLが相対パスの場合やプロトコルがない場合を考慮
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObject = new URL(normalizedUrl);
    return urlObject.hostname;
  } catch {
    return null;
  }
};

/**
 * ドメイン名から複数のファビコンURLを生成する関数
 * フォールバック戦略に基づいて優先度順にURLを返す
 * @param domain - ドメイン名
 * @param size - ファビコンのサイズ（デフォルト: 32）
 * @returns ファビコンURLの配列（優先度順）
 */
const getFaviconUrls = (domain: string, size = 32): string[] => {
  if (!domain) return [];

  return [
    // 1. Google Favicon Service (最も信頼性が高い)
    `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
    // 2. DuckDuckGo Favicon Service (バックアップ)
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
};

/**
 * URLからファビコンURLのリストを取得する関数
 * @param url - MCPサーバーのURL
 * @param size - ファビコンのサイズ（デフォルト: 32）
 * @returns ファビコンURLの配列
 */
const getFaviconUrlsFromUrl = (url: string, size = 32): string[] => {
  const domain = extractDomainFromUrl(url);
  return domain ? getFaviconUrls(domain, size) : [];
};

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
