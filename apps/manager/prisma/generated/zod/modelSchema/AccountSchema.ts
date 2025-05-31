import { z } from 'zod';

/////////////////////////////////////////
// ACCOUNT SCHEMA
/////////////////////////////////////////

/**
 * @namespace NextAuth
 */
export const AccountSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  /**
   * 認証プロバイダーの種類（oauth, oidc, email, credentials）
   */
  type: z.string(),
  /**
   * 認証プロバイダー名（google, github, etc.）
   */
  provider: z.string(),
  /**
   * プロバイダー側のアカウントID
   */
  providerAccountId: z.string(),
  /**
   * リフレッシュトークン
   */
  refresh_token: z.string().nullable(),
  /**
   * アクセストークン
   */
  access_token: z.string().nullable(),
  /**
   * トークンの有効期限（Unixタイムスタンプ）
   */
  expires_at: z.number().int().nullable(),
  /**
   * トークンの種類
   */
  token_type: z.string().nullable(),
  /**
   * 認可スコープ
   */
  scope: z.string().nullable(),
  /**
   * IDトークン
   */
  id_token: z.string().nullable(),
  /**
   * セッション状態
   */
  session_state: z.string().nullable(),
  /**
   * リフレッシュトークンの有効期限（秒）
   */
  refresh_token_expires_in: z.number().int().nullable(),
})

export type Account = z.infer<typeof AccountSchema>

/////////////////////////////////////////
// ACCOUNT OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const AccountOptionalDefaultsSchema = AccountSchema.merge(z.object({
  id: z.string().cuid().optional(),
}))

export type AccountOptionalDefaults = z.infer<typeof AccountOptionalDefaultsSchema>

export default AccountSchema;
