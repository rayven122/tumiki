/**
 * 既存 credentials と入力 credentials をマージする純粋関数。
 * apps/manager の updateMcpConfig と同等のセマンティクス:
 * - MASK 値・空文字は既存値を維持（編集なし扱い）
 * - それ以外は上書き
 * - 既存に存在しないキーは追加しない（キー追加/削除は本機能スコープ外）
 */
export const mergeCredentials = (
  existing: Record<string, string>,
  input: Record<string, string>,
  maskValue: string,
): Record<string, string> => {
  const merged: Record<string, string> = { ...existing };
  for (const [key, value] of Object.entries(input)) {
    if (!(key in existing)) continue;
    if (value === maskValue || value.trim() === "") continue;
    merged[key] = value;
  }
  return merged;
};
