import { z } from 'zod';
import { RoleSchema } from '../inputTypeSchemas/RoleSchema'

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

/**
 * @namespace NextAuth
 * @namespace UserMcpServer
 */
export const UserSchema = z.object({
  /**
   * ユーザーの権限
   */
  role: RoleSchema,
  id: z.string().cuid(),
  /**
   * ユーザー名
   */
  name: z.string().nullable(),
  /**
   * メールアドレス
   */
  email: z.string().nullable(),
  /**
   * メールアドレスの検証日時
   */
  emailVerified: z.coerce.date().nullable(),
  /**
   * プロフィール画像のURL
   */
  image: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// USER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserOptionalDefaultsSchema = UserSchema.merge(z.object({
  /**
   * ユーザーの権限
   */
  role: RoleSchema.optional(),
  id: z.string().cuid().optional(),
}))

export type UserOptionalDefaults = z.infer<typeof UserOptionalDefaultsSchema>

export default UserSchema;
