/**
 * 検証モード（Verification Mode）ユーティリティ
 * 開発・テスト環境で認証をバイパスするための機能
 */

/**
 * 検証モードが有効かどうかを判定
 */
export const isVerificationModeEnabled = (): boolean => {
  return (
    process.env.VERIFICATION_MODE === "true" &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
  );
};

/**
 * デフォルトの検証ユーザーIDを取得
 */
export const getDefaultVerificationUserId = (): string => {
  return process.env.VERIFICATION_USER_ID ?? "verification|admin";
};

/**
 * 利用可能な検証ユーザーIDの配列を取得
 */
export const getAvailableVerificationUserIds = (): string[] => {
  const ids = process.env.VERIFICATION_AVAILABLE_USERS ?? "";
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
};

/**
 * 検証モードの設定を検証
 * @throws {Error} 設定が不正な場合
 */
export const validateVerificationMode = (): void => {
  const defaultId = getDefaultVerificationUserId();
  const availableIds = getAvailableVerificationUserIds();

  if (!availableIds.length) {
    throw new Error(
      "[VERIFICATION MODE] VERIFICATION_AVAILABLE_USERS must be set",
    );
  }

  if (!availableIds.includes(defaultId)) {
    throw new Error(
      `[VERIFICATION MODE] Default user ID "${defaultId}" not in available users`,
    );
  }
};
