import "server-only";
import { randomBytes } from "crypto";

/**
 * 招待トークンを生成する
 * セキュアなランダム文字列を生成
 */
export const generateInviteToken = (): string => {
  return randomBytes(32).toString("hex");
};

/**
 * 招待の有効期限を計算する
 * デフォルトは7日間
 */
export const calculateInviteExpiration = (daysFromNow: number = 7): Date => {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + daysFromNow * 24 * 60 * 60 * 1000);
  return expirationDate;
};

/**
 * 招待が期限切れかどうかをチェック
 */
export const isInviteExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * 招待トークンの形式が正しいかを検証
 */
export const isValidTokenFormat = (token: string): boolean => {
  // 64文字の16進数文字列かどうかをチェック
  return /^[a-f0-9]{64}$/.test(token);
};