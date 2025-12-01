/**
 * MCPサーバー名を正規化
 * - 小文字に変換
 * - 空白をハイフンに変換
 *
 * @param name サーバー名
 * @returns 正規化されたサーバー名
 */
export const normalizeServerName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "-");
};
