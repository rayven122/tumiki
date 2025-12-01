/**
 * MCPサーバー名を正規化
 * - 小文字に変換
 * - 空白をハイフンに変換
 * - ASCII文字、数字、ハイフン以外を削除
 * - 連続するハイフンを1つにまとめる
 * - 先頭・末尾のハイフンを削除
 *
 * @param name サーバー名
 * @returns 正規化されたサーバー名
 */
export const normalizeServerName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-") // 空白をハイフンに変換
    .replace(/[^a-z0-9-]/g, "") // ASCII文字、数字、ハイフン以外を削除
    .replace(/-+/g, "-") // 連続するハイフンを1つにまとめる
    .replace(/^-+|-+$/g, ""); // 先頭・末尾のハイフンを削除
};
