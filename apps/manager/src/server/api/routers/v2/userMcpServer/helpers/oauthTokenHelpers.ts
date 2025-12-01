import { z } from "zod";
import { calculateExpirationStatus } from "@/utils/shared/expirationHelpers";

/**
 * OAuth トークン状態のスキーマ
 */
export const oauthTokenStatusSchema = z.object({
  hasToken: z.boolean(),
  isExpired: z.boolean(),
  isExpiringSoon: z.boolean(),
  expiresAt: z.date().nullable(),
  daysRemaining: z.number().nullable(),
});

export type OAuthTokenStatus = z.infer<typeof oauthTokenStatusSchema>;

/**
 * OAuth トークンの有効期限を計算してステータスを返す
 * Refresh Tokenの有効期限を優先的に使用し、存在しない場合はAccess Tokenの有効期限を使用
 *
 * @param refreshTokenExpiresAt - Refresh Tokenの有効期限（undefined=トークンなし、null=期限切れ、Date=有効期限）
 * @param accessTokenExpiresAt - Access Tokenの有効期限（undefined=トークンなし、null=期限切れ、Date=有効期限）
 * @param now - 現在時刻（デフォルト: new Date()）
 * @returns OAuth トークンの状態
 */
export const calculateOAuthTokenStatus = (
  refreshTokenExpiresAt: Date | null | undefined,
  accessTokenExpiresAt: Date | null | undefined,
  now: Date = new Date(),
): OAuthTokenStatus => {
  // Refresh Tokenの有効期限を優先、なければAccess Tokenの有効期限を使用
  const expiresAt = refreshTokenExpiresAt ?? accessTokenExpiresAt;

  // トークンが存在しない
  if (expiresAt === undefined) {
    return {
      hasToken: false,
      isExpired: false,
      isExpiringSoon: false,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  // 共通ヘルパーを使用して有効期限を計算
  const status = calculateExpirationStatus(expiresAt, now);

  // 1日以内に期限が切れる場合は「期限間近」
  const isExpiringSoon =
    !status.isExpired &&
    status.daysRemaining !== null &&
    status.daysRemaining === 0;

  return {
    hasToken: true,
    isExpired: status.isExpired,
    isExpiringSoon,
    expiresAt: expiresAt ?? null,
    daysRemaining: status.daysRemaining,
  };
};
