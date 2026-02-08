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
 * サーバー名で許可する文字の正規表現
 * - 英数字（大文字・小文字）
 * - 空白、ハイフン、アンダースコア、ドット
 * - 日本語（ひらがな、カタカナ、漢字）は禁止
 */
export const SERVER_NAME_REGEX = /^[a-zA-Z0-9\s\-_.]+$/;

/**
 * サーバー名やその他の名前フィールドで使用する共通バリデーション
 * 1文字以上100文字以下の制限付き
 * 空白や大文字を含む名前を許可（日本語は禁止）
 */
export const nameValidationSchema = z
  .string()
  .min(1, "名前を入力してください")
  .max(100, "名前は100文字以内で入力してください")
  .regex(
    SERVER_NAME_REGEX,
    "名前には英数字、空白、ハイフン、アンダースコア、ドットのみ使用できます",
  );

/**
 * 日本語を含む名前で使用するバリデーション
 * 1文字以上100文字以下の制限付き
 * 日本語（ひらがな、カタカナ、漢字）、英数字、空白、ハイフン、アンダースコア、ドットを許可
 */
export const displayNameValidationSchema = z
  .string()
  .min(1, "名前を入力してください")
  .max(100, "名前は100文字以内で入力してください");
