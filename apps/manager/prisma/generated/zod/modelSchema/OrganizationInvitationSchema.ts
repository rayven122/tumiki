import { z } from 'zod';

/////////////////////////////////////////
// ORGANIZATION INVITATION SCHEMA
/////////////////////////////////////////

/**
 * @namespace Organization
 */
export const OrganizationInvitationSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  /**
   * 招待先メールアドレス
   */
  email: z.string(),
  /**
   * 招待トークン
   */
  token: z.string().cuid(),
  /**
   * 招待者のユーザーID
   */
  invitedBy: z.string(),
  /**
   * 招待された人が管理者になるか
   */
  isAdmin: z.boolean(),
  /**
   * 付与される予定のロールID配列
   */
  roleIds: z.string().array(),
  /**
   * 招待時に追加するグループID配列
   */
  groupIds: z.string().array(),
  /**
   * 招待の有効期限
   */
  expires: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationInvitation = z.infer<typeof OrganizationInvitationSchema>

/////////////////////////////////////////
// ORGANIZATION INVITATION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const OrganizationInvitationOptionalDefaultsSchema = OrganizationInvitationSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * 招待トークン
   */
  token: z.string().cuid().optional(),
  /**
   * 招待された人が管理者になるか
   */
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type OrganizationInvitationOptionalDefaults = z.infer<typeof OrganizationInvitationOptionalDefaultsSchema>

export default OrganizationInvitationSchema;
