/**
 * 名前からslugを生成（小文字・ハイフン区切り）
 * main / renderer 両方で使用する共通ユーティリティ
 */
export const toSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * フォールバックslug用のランダムサフィックスを生成（base36, 既定4文字）
 * Web Crypto API を利用するため main / renderer 両方で動作する
 */
export const generateRandomSuffix = (length = 4): string => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // 0-9, a-z の36文字に正規化（Anthropic API tool name 制約 ^[a-zA-Z0-9_-]{1,64}$ に適合）
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
};
