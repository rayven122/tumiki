import { z } from 'zod';

/////////////////////////////////////////
// VERIFICATION TOKEN SCHEMA
/////////////////////////////////////////

/**
 * @namespace NextAuth
 */
export const VerificationTokenSchema = z.object({
  /**
   * 検証対象の識別子（メールアドレスなど）
   */
  identifier: z.string(),
  /**
   * 検証トークン
   */
  token: z.string(),
  /**
   * トークンの有効期限
   */
  expires: z.coerce.date(),
})

export type VerificationToken = z.infer<typeof VerificationTokenSchema>

/////////////////////////////////////////
// VERIFICATION TOKEN OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const VerificationTokenOptionalDefaultsSchema = VerificationTokenSchema.merge(z.object({
}))

export type VerificationTokenOptionalDefaults = z.infer<typeof VerificationTokenOptionalDefaultsSchema>

export default VerificationTokenSchema;
