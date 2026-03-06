"use client";

import { Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { McpServerIcon } from "../../../mcps/_components/McpServerIcon";

type ServerIconProps = {
  iconPath?: string | null;
  fallbackColor?: "blue" | "purple";
  size?: "sm" | "md";
};

/**
 * MCPサーバーアイコン
 * アイコンパスがある場合は画像を表示、なければフォールバックアイコンを表示
 * lucide:* 形式のアイコンパスにも対応
 */
export const ServerIcon = ({
  iconPath,
  fallbackColor = "blue",
  size = "md",
}: ServerIconProps) => {
  const sizeClass = size === "sm" ? "h-4 w-4" : "h-8 w-8";
  const iconSizeClass = size === "sm" ? "h-2.5 w-2.5" : "h-4 w-4";
  const iconSize = size === "sm" ? 16 : 32;

  // アイコンパスがある場合はMcpServerIconを使用
  if (iconPath) {
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-md border",
          size === "sm" && "rounded-sm",
          sizeClass,
          fallbackColor === "blue" && "border-blue-200",
          fallbackColor === "purple" && "border-purple-200",
        )}
      >
        <McpServerIcon iconPath={iconPath} alt="Server icon" size={iconSize} />
      </div>
    );
  }

  // フォールバック
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
