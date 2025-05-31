import { z } from 'zod';

/////////////////////////////////////////
// ORGANIZATION MEMBER SCHEMA
/////////////////////////////////////////

/**
 * @namespace Organization
 */
export const OrganizationMemberSchema = z.object({
  id: z.string().cuid(),
  organizationId: z.string(),
  userId: z.string(),
  /**
   * このメンバーが管理者権限を持つか
   */
  isAdmin: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>

/////////////////////////////////////////
// ORGANIZATION MEMBER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const OrganizationMemberOptionalDefaultsSchema = OrganizationMemberSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * このメンバーが管理者権限を持つか
   */
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type OrganizationMemberOptionalDefaults = z.infer<typeof OrganizationMemberOptionalDefaultsSchema>

export default OrganizationMemberSchema;
