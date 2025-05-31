import { z } from 'zod';

/////////////////////////////////////////
// ORGANIZATION SCHEMA
/////////////////////////////////////////

/**
 * @namespace Organization
 */
export const OrganizationSchema = z.object({
  id: z.string().cuid(),
  /**
   * 組織名
   */
  name: z.string(),
  /**
   * 組織の説明
   */
  description: z.string().nullable(),
  /**
   * 組織のロゴURL
   */
  logoUrl: z.string().nullable(),
  /**
   * 論理削除フラグ
   */
  isDeleted: z.boolean(),
  /**
   * 組織の作成者
   */
  createdBy: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Organization = z.infer<typeof OrganizationSchema>

/////////////////////////////////////////
// ORGANIZATION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const OrganizationOptionalDefaultsSchema = OrganizationSchema.merge(z.object({
  id: z.string().cuid().optional(),
  /**
   * 論理削除フラグ
   */
  isDeleted: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type OrganizationOptionalDefaults = z.infer<typeof OrganizationOptionalDefaultsSchema>

export default OrganizationSchema;
