import { CREDENTIALS_MASK_VALUE } from "../../../shared/mcp.constants";

/**
 * 認証情報フィールドのマスク表示用文字列。UI 側でもこの値を初期表示に使う。
 * IPC 戻り値は本値で埋められて renderer に返るため、平文の認証情報は renderer に渡らない。
 * 共通定数 CREDENTIALS_MASK_VALUE への薄いエイリアスとして公開する。
 */
export const MASK_VALUE = CREDENTIALS_MASK_VALUE;

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
