import { z } from "zod";

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
 *
 * @param expiresAt - トークンの有効期限（undefined=トークンなし、null=期限切れ、Date=有効期限）
 * @param now - 現在時刻（デフォルト: new Date()）
 * @returns OAuth トークンの状態
 */
export const calculateOAuthTokenStatus = (
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): OAuthTokenStatus => {
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

  // expiresAt が null の場合は期限切れ
  if (!expiresAt) {
    return {
      hasToken: true,
      isExpired: true,
      isExpiringSoon: false,
      expiresAt: null,
      daysRemaining: null,
    };
  }

  // 有効期限を計算
  const isExpired = expiresAt < now;
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const isExpiringSoon = !isExpired && expiresAt < oneDayFromNow;
  const daysRemaining = !isExpired
    ? Math.floor((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  return {
    hasToken: true,
    isExpired,
    isExpiringSoon,
    expiresAt,
    daysRemaining,
  };
};
