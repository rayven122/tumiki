import { z } from 'zod';

/////////////////////////////////////////
// SESSION SCHEMA
/////////////////////////////////////////

/**
 * @namespace NextAuth
 */
export const SessionSchema = z.object({
  id: z.string().cuid(),
  /**
   * セッショントークン
   */
  sessionToken: z.string(),
  userId: z.string(),
  /**
   * セッションの有効期限
   */
  expires: z.coerce.date(),
})

export type Session = z.infer<typeof SessionSchema>

/////////////////////////////////////////
// SESSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const SessionOptionalDefaultsSchema = SessionSchema.merge(z.object({
  id: z.string().cuid().optional(),
}))

export type SessionOptionalDefaults = z.infer<typeof SessionOptionalDefaultsSchema>

export default SessionSchema;
