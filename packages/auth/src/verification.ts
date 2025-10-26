/**
 * 検証モードユーティリティ（最小実装版）
 * 開発・テスト環境でのAuth0バイパス機能を提供
 */

/**
 * 検証モードが有効かどうかをチェック
 * 本番環境では常にfalseを返す
 */
export const isVerificationModeEnabled = (): boolean => {
  // 本番環境では常にfalse
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.VERIFICATION_MODE === "true";
};

/**
 * デフォルトの検証ユーザーIDを取得
 */
export const getDefaultVerificationUserId = (): string => {
  return process.env.VERIFICATION_USER_ID || "verification|admin";
};

/**
 * 利用可能な検証ユーザーIDリストを取得
 */
export const getAvailableVerificationUserIds = (): string[] => {
  const ids =
    process.env.VERIFICATION_AVAILABLE_USERS ||
    "verification|admin,verification|user";
  return ids.split(",").map((id) => id.trim());
};

/**
 * セキュリティ検証
 * 本番環境で検証モードが有効になっている場合はエラーをスロー
 */
export const validateVerificationMode = (): void => {
  if (process.env.NODE_ENV === "production" && isVerificationModeEnabled()) {
    throw new Error(
      "[SECURITY] Verification mode cannot be enabled in production",
    );
  }
};
