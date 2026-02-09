"use client";

import Image from "next/image";
import { FaviconImage } from "@/components/ui/FaviconImage";
import { ImageIcon } from "lucide-react";
import { getIconComponent } from "./McpIconPicker";

type McpServerIconProps = {
  iconPath: string | null | undefined;
  fallbackUrl?: string | null;
  alt?: string;
  size?: number;
};

/**
 * MCPサーバーのアイコンを表示するコンポーネント
 *
 * iconPathの形式に応じて適切なアイコンを表示:
 * - `lucide:{iconName}`: lucide-reactアイコンを表示
 * - URL形式: Imageコンポーネントで画像を表示
 * - null/undefined: FaviconImage（フォールバック）を表示
 *
 * @param iconPath アイコンパス（lucide:* 形式またはURL）
 * @param fallbackUrl ファビコン取得用のURL
 * @param alt 代替テキスト
 * @param size アイコンサイズ（px）
 */
export const McpServerIcon = ({
  iconPath,
  fallbackUrl,
  alt = "MCPサーバー",
  size = 32,
}: McpServerIconProps) => {
  // lucide:* 形式 → lucide-reactアイコンを表示
  if (iconPath?.startsWith("lucide:")) {
    const iconName = iconPath.replace("lucide:", "");
    const IconComponent = getIconComponent(iconName);

    if (IconComponent) {
      return (
        <IconComponent
          className="text-primary"
          style={{ width: size, height: size }}
        />
      );
    }
    // lucide:形式だがアイコンが見つからない場合はフォールバックへ
  }

  // URL形式 → Imageコンポーネント
  if (iconPath) {
    const isSvg = iconPath.toLowerCase().endsWith(".svg");
    return (
      <Image
        src={iconPath}
        alt={alt}
        width={size}
        height={size}
        className="rounded-md object-cover"
        unoptimized={isSvg}
      />
    );
  }

  // フォールバック → FaviconImage
  return (
    <FaviconImage
      url={fallbackUrl}
      alt={alt}
      size={size}
      fallback={
        <div
          className="flex items-center justify-center rounded-md bg-gray-200"
          style={{ width: size, height: size }}
        >
          <ImageIcon className="size-4 text-gray-500" />
        </div>
      }
    />
  );
};
