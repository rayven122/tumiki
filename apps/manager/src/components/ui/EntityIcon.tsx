"use client";

import { Bot, Server } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FaviconImage } from "./FaviconImage";
import { getIconComponent } from "@/app/[orgSlug]/mcps/_components/McpIconPicker";
import { parseIconPath, getIconColorClass } from "@/lib/iconColor";

/**
 * サイズバリアント
 * - xs: 16x16 (アイコン16px) - サイドバー等の極小表示用（コンテナなし）
 * - sm: 32x32 (アイコン20px) - アクティビティカード等の小さい表示用
 * - md: 48x48 (アイコン28px) - 標準サイズ（カード、詳細ページ共通）
 */
type SizeVariant = "xs" | "sm" | "md";

/**
 * エンティティタイプ（フォールバックアイコン選択用）
 * - agent: Botアイコン
 * - mcp: Serverアイコン
 */
type EntityType = "agent" | "mcp";

type EntityIconProps = {
  /** アイコンパス（lucide:*, URL, null） */
  iconPath: string | null | undefined;
  /** フォールバックURL（faviconとして使用） */
  fallbackUrl?: string | null;
  /** 代替テキスト */
  alt?: string;
  /** サイズバリアント */
  size?: SizeVariant;
  /** エンティティタイプ（フォールバックアイコン用） */
  type?: EntityType;
  /** 追加のクラス名 */
  className?: string;
};

/** サイズバリアントごとの設定 */
const SIZE_CONFIG: Record<
  SizeVariant,
  {
    container: string;
    iconSize: number;
    fallbackIconClass: string;
    noContainer?: boolean;
  }
> = {
  xs: {
    container: "",
    iconSize: 16,
    fallbackIconClass: "h-4 w-4",
    noContainer: true, // コンテナなしでアイコンのみ表示
  },
  sm: {
    container: "h-8 w-8",
    iconSize: 20,
    fallbackIconClass: "h-5 w-5",
  },
  md: {
    container: "h-12 w-12",
    iconSize: 28,
    fallbackIconClass: "h-7 w-7",
  },
};

/** フォールバックアイコン（エンティティタイプに応じて選択） */
const FallbackIcon = ({
  type,
  iconClass,
}: {
  type: EntityType;
  iconClass: string;
}) => {
  const combinedClass = cn(iconClass, "text-gray-500");

  if (type === "agent") {
    return <Bot className={combinedClass} />;
  }
  return <Server className={combinedClass} />;
};

/**
 * エンティティ（エージェント/MCPサーバー）のアイコン表示用統一コンポーネント
 *
 * iconPathの形式に応じて適切なアイコンを表示:
 * - `lucide:{iconName}`: lucide-reactアイコンを表示
 * - URL形式: Imageコンポーネントで画像を表示
 * - null/undefined: エンティティタイプに応じたデフォルトアイコンを表示
 *
 * @example
 * // エージェント用（48x48、Botフォールバック）
 * <EntityIcon iconPath={agent.iconPath} type="agent" alt={agent.name} />
 *
 * // MCPサーバー用（48x48、Serverフォールバック）
 * <EntityIcon iconPath={server.iconPath} type="mcp" alt={server.name} />
 *
 * // 小さいサイズ（32x32、アクティビティカード用）
 * <EntityIcon iconPath={agent.iconPath} type="agent" size="sm" alt={agent.name} />
 */
export const EntityIcon = ({
  iconPath,
  fallbackUrl,
  alt = "アイコン",
  size = "md",
  type = "agent",
  className,
}: EntityIconProps) => {
  const sizeConfig = SIZE_CONFIG[size];
  const noContainer = sizeConfig.noContainer;

  const containerClass = cn(
    "flex items-center justify-center rounded-xl border border-gray-200 bg-white shrink-0",
    sizeConfig.container,
    className,
  );

  // ラッパー関数：noContainerの場合はアイコンのみ、それ以外はコンテナ付き
  const wrapWithContainer = (content: React.ReactNode) =>
    noContainer ? (
      <span className={cn("shrink-0", className)}>{content}</span>
    ) : (
      <div className={containerClass}>{content}</div>
    );

  // lucide:* 形式 → lucide-reactアイコンを表示
  if (iconPath?.startsWith("lucide:")) {
    const parsed = parseIconPath(iconPath);

    if (parsed) {
      const IconComponent = getIconComponent(parsed.iconName);
      const colorClass = getIconColorClass(parsed.color);

      if (IconComponent) {
        return wrapWithContainer(
          <IconComponent
            className={colorClass}
            style={{
              width: sizeConfig.iconSize,
              height: sizeConfig.iconSize,
            }}
          />,
        );
      }
    }
    // lucide:形式だがアイコンが見つからない場合はフォールバック
    return wrapWithContainer(
      <FallbackIcon type={type} iconClass={sizeConfig.fallbackIconClass} />,
    );
  }

  // URL形式 → Imageコンポーネント
  if (iconPath) {
    const isSvg = iconPath.toLowerCase().endsWith(".svg");
    return wrapWithContainer(
      <Image
        src={iconPath}
        alt={alt}
        width={sizeConfig.iconSize}
        height={sizeConfig.iconSize}
        className="rounded-md object-cover"
        unoptimized={isSvg}
      />,
    );
  }

  // fallbackUrlがある場合 → FaviconImage
  if (fallbackUrl) {
    return wrapWithContainer(
      <FaviconImage
        url={fallbackUrl}
        alt={alt}
        size={sizeConfig.iconSize}
        fallback={
          <FallbackIcon type={type} iconClass={sizeConfig.fallbackIconClass} />
        }
      />,
    );
  }

  // フォールバック → デフォルトアイコン
  return wrapWithContainer(
    <FallbackIcon type={type} iconClass={sizeConfig.fallbackIconClass} />,
  );
};
