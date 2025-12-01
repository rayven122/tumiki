/**
 * サーバー名を正規化（小文字化、空白をハイフンに変換）
 *
 * @param name - 正規化するサーバー名
 * @returns 正規化されたサーバー名（小文字、空白をハイフンに変換）
 */
export const normalizeServerName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "-");
};
