"use client";

import type React from "react";

type LinkifiedTextProps = {
  text: string;
  className?: string;
};

/**
 * URLを検出し、短縮形式のハイパーリンクとして表示するコンポーネント
 * - URLは「ホスト名」のみに短縮表示
 * - 別タブで開く（target="_blank"）
 * - セキュリティ対策（rel="noopener noreferrer"）
 */
export const LinkifiedText: React.FC<LinkifiedTextProps> = ({
  text,
  className,
}) => {
  // URLを検出する正規表現
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  /**
   * URLからホスト名を抽出し、短縮形式で表示
   * 例: https://developers.figma.com/docs/figma-mcp-server/ → developers.figma.com
   */
  const getShortenedUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  /**
   * テキストをURLと非URL部分に分割し、URLをリンクに変換
   */
  const parseText = (inputText: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(inputText)) !== null) {
      // URL前のテキスト
      if (match.index > lastIndex) {
        parts.push(inputText.slice(lastIndex, match.index));
      }

      const url = match[0];
      const shortenedUrl = getShortenedUrl(url);

      // URLをハイパーリンクとして追加
      parts.push(
        <a
          key={`${match.index}-${url}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {shortenedUrl}
        </a>,
      );

      lastIndex = match.index + url.length;
    }

    // 残りのテキスト
    if (lastIndex < inputText.length) {
      parts.push(inputText.slice(lastIndex));
    }

    return parts;
  };

  return <span className={className}>{parseText(text)}</span>;
};
