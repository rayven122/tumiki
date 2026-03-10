/**
 * ランディングページ共通のボタンスタイル定義
 * CTAボタン（SignUpButton）で使用
 */

/**
 * CTAボタンのスタイル（デスクトップ/モバイル）
 */
export const SIGNUP_BUTTON_STYLES = {
  desktop:
    "border-2 border-black bg-black px-7 py-3 font-semibold text-white shadow-[3px_3px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0_#6366f1]",
  mobile:
    "border-2 border-black bg-black px-3 py-2 text-xs font-semibold text-white shadow-[2px_2px_0_#6366f1] transition-all duration-300 hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0_#6366f1]",
} as const;

/**
 * CTAボタンのスケルトンスタイル（ローディング時）
 */
export const SIGNUP_SKELETON_STYLES = {
  desktop:
    "h-12 w-32 animate-pulse rounded border-2 border-gray-300 bg-gray-200",
  mobile: "h-9 w-20 animate-pulse rounded border-2 border-gray-300 bg-gray-200",
} as const;
