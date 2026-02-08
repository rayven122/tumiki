/**
 * unknown 型のエラーを Error オブジェクトに変換するユーティリティ
 *
 * catch ブロックで受け取る error は unknown 型のため、
 * `as Error` キャストの代わりに型安全な変換を行う
 */

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
  return new Error(String(error));
};
