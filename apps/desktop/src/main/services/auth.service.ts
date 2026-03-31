import { getDb } from "../db";
import * as authRepository from "../repositories/auth.repository";
import { encryptToken, decryptToken } from "../utils/encryption";
import * as logger from "../utils/logger";

/**
 * 認証トークンを取得（復号化済み）
 * 期限切れ・破損トークンは自動削除してnullを返す
 */
export const getToken = async (): Promise<string | null> => {
  const db = await getDb();
  const token = await authRepository.findLatest(db);

  if (!token) {
    return null;
  }

  // トークン期限チェック（期限切れの場合はDBから削除）
  if (new Date() > token.expiresAt) {
    logger.debug("Token expired, deleting from database");
    await authRepository.deleteById(db, token.id);
    return null;
  }

  // 暗号化されたトークンを非同期で復号化
  const decryptedToken = await decryptToken(token.accessToken);

  // 復号化されたトークンの有効性検証（破損トークンはDBから削除）
  if (!decryptedToken || decryptedToken.length === 0) {
    logger.warn(
      "Decrypted token is invalid or empty, deleting corrupted token",
    );
    await authRepository.deleteById(db, token.id);
    return null;
  }

  return decryptedToken;
};

/**
 * 認証トークンを暗号化して保存
 * 最新のトークンのみ残し、古いトークンを削除
 */
export const saveToken = async (data: {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}): Promise<{ success: true }> => {
  const db = await getDb();

  // 新しいトークンを非同期で暗号化して保存
  const newToken = await authRepository.create(db, {
    accessToken: await encryptToken(data.accessToken),
    refreshToken: await encryptToken(data.refreshToken),
    expiresAt: data.expiresAt,
  });

  // 最新のトークンのみ残し、古いトークンを削除
  await authRepository.deleteAllExcept(db, newToken.id);

  logger.info("Auth token saved successfully");
  return { success: true };
};

/**
 * すべての認証トークンを削除（ログアウト時）
 */
export const clearToken = async (): Promise<{ success: true }> => {
  const db = await getDb();
  await authRepository.deleteAll(db);
  logger.info("Auth token cleared");
  return { success: true };
};

/**
 * 認証状態を確認（有効なトークンが存在するか）
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const db = await getDb();
  const token = await authRepository.findLatest(db);

  if (!token) {
    return false;
  }

  // トークンが有効期限内か確認
  return new Date() <= token.expiresAt;
};
