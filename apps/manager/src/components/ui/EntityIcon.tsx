"use client";

import { Bot, Server } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { FaviconImage } from "./FaviconImage";
import { getIconComponent } from "@/app/[orgSlug]/mcps/_components/McpIconPicker";
import { parseIconPath, getIconColorClass } from "@/lib/iconColor";

/**
 * サイズバリアントの定義
 * 新しいサイズを追加する場合は、このオブジェクトにキーを追加し、
 * 対応する設定も追加する
 */
const SIZE_VARIANTS = {
  /** 16x16 (アイコン16px) - サイドバー等の極小表示用（コンテナなし） */
  xs: "xs",
  /** 32x32 (アイコン20px) - アクティビティカード等の小さい表示用 */
  sm: "sm",
  /** 48x48 (アイコン28px) - 標準サイズ（カード、詳細ページ共通） */
  md: "md",
} as const;

/** サイズバリアント型（SIZE_VARIANTSから自動生成） */
type SizeVariant = (typeof SIZE_VARIANTS)[keyof typeof SIZE_VARIANTS];

/** デフォルトのサイズバリアント */
const DEFAULT_SIZE: SizeVariant = "md";

/**
 * サイズバリアントのバリデーション
 * 無効な値の場合はデフォルト値を返す
 */
const validateSizeVariant = (size: string | undefined): SizeVariant => {
  if (size && size in SIZE_VARIANTS) {
    return size as SizeVariant;
  }
  return DEFAULT_SIZE;
};

/**
 * エンティティタイプの定義
 */
const ENTITY_TYPES = {
  /** Botアイコン */
  agent: "agent",
  /** Serverアイコン */
  mcp: "mcp",
} as const;

/** エンティティタイプ型（ENTITY_TYPESから自動生成） */
type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

/** デフォルトのエンティティタイプ */
const DEFAULT_ENTITY_TYPE: EntityType = "agent";

/**
 * エンティティタイプのバリデーション
 * 無効な値の場合はデフォルト値を返す
 */
const validateEntityType = (type: string | undefined): EntityType => {
  if (type && type in ENTITY_TYPES) {
    return type as EntityType;
  }
  return DEFAULT_ENTITY_TYPE;
};

/** サイズ設定の型定義 */
type SizeConfig = {
  container: string;
  iconSize: number;
  fallbackIconClass: string;
  noContainer: boolean;
};

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

/** サイズバリアントごとの設定（satisfiesで型安全性を確保） */
const SIZE_CONFIG = {
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
    noContainer: false,
  },
  md: {
    container: "h-12 w-12",
    iconSize: 28,
    fallbackIconClass: "h-7 w-7",
    noContainer: false,
  },
} as const satisfies Record<SizeVariant, SizeConfig>;

/**
 * サイズ設定を取得（バリデーション付き）
 */
const getSizeConfig = (
  size: SizeVariant,
): (typeof SIZE_CONFIG)[SizeVariant] => {
  return SIZE_CONFIG[size];
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
  size = DEFAULT_SIZE,
  type = DEFAULT_ENTITY_TYPE,
  className,
}: EntityIconProps) => {
  // バリデーション付きで設定を取得（型安全性を確保）
  const validatedSize = validateSizeVariant(size);
  const validatedType = validateEntityType(type);
  const sizeConfig = getSizeConfig(validatedSize);
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
      <FallbackIcon
        type={validatedType}
        iconClass={sizeConfig.fallbackIconClass}
      />,
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
          <FallbackIcon
            type={validatedType}
            iconClass={sizeConfig.fallbackIconClass}
          />
        }
      />,
    );
  }

  // フォールバック → デフォルトアイコン
  return wrapWithContainer(
    <FallbackIcon
      type={validatedType}
      iconClass={sizeConfig.fallbackIconClass}
    />,
  );
};
