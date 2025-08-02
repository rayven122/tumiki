import { z } from "zod";

/**
 * 英数字、ハイフン、アンダースコアのみを許可する正規表現
 */
export const ALPHANUMERIC_WITH_HYPHEN_UNDERSCORE_REGEX = /^[a-zA-Z0-9\-_]+$/;

/**
 * 英数字、ハイフン、アンダースコアのみを許可する汎用バリデーション
 * 文字数制限は使用する側で min() や max() を追加して設定する
 */
export const alphanumericWithHyphenUnderscoreSchema = z
  .string()
  .regex(
    ALPHANUMERIC_WITH_HYPHEN_UNDERSCORE_REGEX,
    "英数字、ハイフン、アンダースコアのみ使用可能",
  );

/**
 * サーバー名やその他の名前フィールドで使用する共通バリデーション
 * 1文字以上100文字以下の制限付き
 */
export const nameValidationSchema = alphanumericWithHyphenUnderscoreSchema
  .min(1)
  .max(100);
