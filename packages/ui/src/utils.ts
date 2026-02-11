import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind CSSクラスをマージするユーティリティ関数
 * clsx でクラス名を結合し、twMerge で重複するTailwindクラスを解決する
 */
export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};
