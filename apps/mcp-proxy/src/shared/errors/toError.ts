/**
 * unknown 型のエラーを Error オブジェクトに変換するユーティリティ
 *
 * catch ブロックで受け取る error は unknown 型のため、
 * `as Error` キャストの代わりに型安全な変換を行う
 */

/**
 * 値を安全に文字列に変換
 * toString が適切に動作しないオブジェクトでも例外を発生させない
 */
const safeStringify = (value: unknown): string => {
  try {
    return String(value);
  } catch {
    // String() が失敗する場合（toString が不正な値を持つオブジェクトなど）
    return "[object Unknown]";
  }
};

/**
 * unknown 型のエラーを Error オブジェクトに変換
 *
 * @param error - 任意のエラー値
 * @returns Error オブジェクト
 */
export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(safeStringify(error));
};
