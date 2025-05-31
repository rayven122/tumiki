import { z } from 'zod';

/////////////////////////////////////////
// ORGANIZATION ROLE SCHEMA
/////////////////////////////////////////

/**
 * ロール定義
 * @namespace Organization
 */
export const OrganizationRoleSchema = z.object({
  id: z.string().cuid(),
  /**
   * ロール名
   */
  name: z.string(),
  /**
   * ロールの説明
   */
  description: z.string().nullable(),
  /**
   * 組織ID
   */
  organizationId: z.string(),
  /**
   * デフォルトロールか
   */
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>

/////////////////////////////////////////
// ORGANIZATION ROLE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const OrganizationRoleOptionalDefaultsSchema = OrganizationRoleSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * デフォルトロールか
   */
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type OrganizationRoleOptionalDefaults = z.infer<typeof OrganizationRoleOptionalDefaultsSchema>

export default OrganizationRoleSchema;
