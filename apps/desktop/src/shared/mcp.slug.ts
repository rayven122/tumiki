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
