/**
 * DiscoveryError / OAuth IPC で共通のエラーコード（文字列の単一の定義元）
 */
export const DISCOVERY_ERROR_CODE = {
  DCR_NOT_SUPPORTED: "DCR_NOT_SUPPORTED",
  DCR_REGISTRATION_FAILED: "DCR_REGISTRATION_FAILED",
  AS_DISCOVERY_ERROR: "AS_DISCOVERY_ERROR",
  DISCOVERY_ERROR: "DISCOVERY_ERROR",
  /** manager 側とメッセージ辞書を揃えるため（desktop では未使用のときあり） */
  ISSUER_VALIDATION_ERROR: "ISSUER_VALIDATION_ERROR",
} as const;

export type DiscoveryErrorCode =
  (typeof DISCOVERY_ERROR_CODE)[keyof typeof DISCOVERY_ERROR_CODE];

/** エラーメッセージから "[CODE] message" 形式のコードと表示メッセージを抽出 */
export const extractOAuthErrorCode = (
  message: string,
): { code: string | null; displayMessage: string } => {
  const codeMatch = message.match(/\[(\w+)]\s/);
  if (!codeMatch) return { code: null, displayMessage: message };
  return {
    code: codeMatch[1] ?? null,
    displayMessage: message.slice((codeMatch.index ?? 0) + codeMatch[0].length),
  };
};
