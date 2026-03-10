"use client";

import Image from "next/image";
import { FaviconImage } from "@/features/shared/components/FaviconImage";
import { ImageIcon } from "lucide-react";
import { getIconComponent } from "./McpIconPicker";
import { parseIconPath, getIconColorClass } from "@/lib/iconColor";

type McpServerIconProps = {
  iconPath: string | null | undefined;
  fallbackUrl?: string | null;
  alt?: string;
  size?: number;
};

/**
 * ファビコンフォールバック表示用のヘルパーコンポーネント
 */
const FaviconFallback = ({
  fallbackUrl,
  alt,
  size,
}: {
  fallbackUrl: string | null | undefined;
  alt: string;
  size: number;
}) => (
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

/**
 * MCPサーバーのアイコンを表示するコンポーネント
 *
 * iconPathの形式に応じて適切なアイコンを表示:
 * - `lucide:{iconName}`: lucide-reactアイコンを表示
 * - URL形式: Imageコンポーネントで画像を表示
 * - null/undefined: FaviconImage（フォールバック）を表示
 */
export const McpServerIcon = ({
  iconPath,
  fallbackUrl,
  alt = "MCPサーバー",
  size = 32,
}: McpServerIconProps) => {
  // lucide:* 形式 → lucide-reactアイコンを表示
  if (iconPath?.startsWith("lucide:")) {
    const parsed = parseIconPath(iconPath);

    if (parsed) {
      const IconComponent = getIconComponent(parsed.iconName);
      const colorClass = getIconColorClass(parsed.color);

      if (IconComponent) {
        return (
          <IconComponent
            className={colorClass}
            style={{ width: size, height: size }}
          />
        );
      }
    }
    // lucide:形式だがアイコンが見つからない場合はフォールバックへ
    return <FaviconFallback fallbackUrl={fallbackUrl} alt={alt} size={size} />;
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
  return <FaviconFallback fallbackUrl={fallbackUrl} alt={alt} size={size} />;
};
