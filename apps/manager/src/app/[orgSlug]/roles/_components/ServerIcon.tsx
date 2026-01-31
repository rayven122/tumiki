"use client";

import Image from "next/image";
import { Server } from "lucide-react";
import { cn } from "@/lib/utils";

type ServerIconProps = {
  iconPath?: string | null;
  fallbackColor?: "blue" | "purple";
  size?: "sm" | "md";
};

/**
 * MCPサーバーアイコン
 * アイコンパスがある場合は画像を表示、なければフォールバックアイコンを表示
 */
export const ServerIcon = ({
  iconPath,
  fallbackColor = "blue",
  size = "md",
}: ServerIconProps) => {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-8 w-8";
  const iconSizeClass = size === "sm" ? "h-2.5 w-2.5" : "h-4 w-4";
  const imageSizes = size === "sm" ? "16px" : "32px";

  if (iconPath) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-md border",
          size === "sm" && "rounded-sm",
          sizeClass,
        )}
      >
        <Image
          src={iconPath}
          alt="Server icon"
          fill
          className="object-cover"
          sizes={imageSizes}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md border",
        sizeClass,
        fallbackColor === "blue" &&
          "border-blue-200 bg-blue-500/10 text-blue-600",
        fallbackColor === "purple" &&
          "border-purple-200 bg-purple-500/10 text-purple-600",
      )}
    >
      <Server className={iconSizeClass} />
    </div>
  );
};
