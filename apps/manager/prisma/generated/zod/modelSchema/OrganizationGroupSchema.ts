import { z } from 'zod';

/////////////////////////////////////////
// ORGANIZATION GROUP SCHEMA
/////////////////////////////////////////

/**
 * @namespace Organization
 */
export const OrganizationGroupSchema = z.object({
  id: z.string().cuid(),
  /**
   * グループ名
   */
  name: z.string(),
  /**
   * グループの説明
   */
  description: z.string().nullable(),
  /**
   * 組織ID
   */
  organizationId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type OrganizationGroup = z.infer<typeof OrganizationGroupSchema>

/////////////////////////////////////////
// ORGANIZATION GROUP OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const OrganizationGroupOptionalDefaultsSchema = OrganizationGroupSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type OrganizationGroupOptionalDefaults = z.infer<typeof OrganizationGroupOptionalDefaultsSchema>

export default OrganizationGroupSchema;
