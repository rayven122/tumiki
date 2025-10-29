import { createHash } from "node:crypto";

/**
 * 機密情報（ID等）をハッシュ化してログ出力用に安全な形式に変換
 * @param value - ハッシュ化する値
 * @returns ハッシュ化された値の先頭8文字
 */
export const sanitizeIdForLog = (value: string): string => {
  // SHA-256でハッシュ化し、先頭8文字のみ使用
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
};
