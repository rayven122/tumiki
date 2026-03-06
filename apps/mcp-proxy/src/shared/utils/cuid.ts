/**
 * CUID生成ユーティリティ
 *
 * データベースのID生成に使用するCUID互換のID生成関数
 */

/**
 * CUID形式のIDを生成
 * 'c'で始まる25文字の英数字ID
 */
export const generateCUID = (): string => {
  const chars =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "c";
  for (let i = 0; i < 24; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
};
