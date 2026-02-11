/**
 * アイコンカラーパレット機能
 *
 * iconPathフィールドを拡張してカラー情報を含める
 * 形式: lucide:IconName#ColorName
 * 例: lucide:Server#blue, lucide:Bot#emerald
 */

/**
 * プリセットカラー定義（6色）
 * textClassName: アイコン表示用、bgClassName: カラーピッカーのサークル表示用
 */
export const ICON_COLOR_PALETTE = [
  {
    name: "primary",
    label: "ネイビー",
    textClassName: "text-primary",
    bgClassName: "bg-primary",
  },
  {
    name: "emerald",
    label: "エメラルド",
    textClassName: "text-emerald-600",
    bgClassName: "bg-emerald-600",
  },
  {
    name: "blue",
    label: "ブルー",
    textClassName: "text-blue-600",
    bgClassName: "bg-blue-600",
  },
  {
    name: "amber",
    label: "アンバー",
    textClassName: "text-amber-600",
    bgClassName: "bg-amber-600",
  },
  {
    name: "red",
    label: "レッド",
    textClassName: "text-red-600",
    bgClassName: "bg-red-600",
  },
  {
    name: "gray",
    label: "グレー",
    textClassName: "text-gray-600",
    bgClassName: "bg-gray-600",
  },
] as const;

export type IconColorName = (typeof ICON_COLOR_PALETTE)[number]["name"];

/**
 * パースされたアイコン情報
 */
export type ParsedIconPath = {
  iconName: string;
  color: IconColorName;
};

/**
 * デフォルトカラー
 */
export const DEFAULT_ICON_COLOR: IconColorName = "primary";

/**
 * iconPathをパースしてアイコン名とカラーを取得
 *
 * @param iconPath lucide:IconName または lucide:IconName#ColorName 形式
 * @returns パースされたアイコン情報（lucide:形式でない場合はnull）
 */
export const parseIconPath = (
  iconPath: string | null | undefined,
): ParsedIconPath | null => {
  if (!iconPath?.startsWith("lucide:")) {
    return null;
  }

  const withoutPrefix = iconPath.replace("lucide:", "");
  const hashIndex = withoutPrefix.indexOf("#");

  if (hashIndex === -1) {
    // カラー指定なし → デフォルトカラー
    return {
      iconName: withoutPrefix,
      color: DEFAULT_ICON_COLOR,
    };
  }

  const iconName = withoutPrefix.substring(0, hashIndex);
  const colorName = withoutPrefix.substring(hashIndex + 1);

  // 有効なカラー名かチェック
  const validColor = ICON_COLOR_PALETTE.find((c) => c.name === colorName);

  return {
    iconName,
    color: validColor ? (colorName as IconColorName) : DEFAULT_ICON_COLOR,
  };
};

/**
 * アイコン名とカラーからiconPath形式の文字列を生成
 *
 * @param iconName lucideアイコン名
 * @param color カラー名
 * @returns lucide:IconName#ColorName 形式の文字列
 */
export const buildIconPath = (
  iconName: string,
  color: IconColorName,
): string => {
  // デフォルトカラーの場合はカラー指定を省略（下位互換性）
  if (color === DEFAULT_ICON_COLOR) {
    return `lucide:${iconName}`;
  }
  return `lucide:${iconName}#${color}`;
};

/**
 * カラー名からTailwind CSSテキストカラークラスを取得
 *
 * @param color カラー名
 * @returns Tailwind CSSクラス
 */
export const getIconColorClass = (color: IconColorName): string => {
  const palette = ICON_COLOR_PALETTE.find((c) => c.name === color);
  return palette?.textClassName ?? "text-primary";
};
