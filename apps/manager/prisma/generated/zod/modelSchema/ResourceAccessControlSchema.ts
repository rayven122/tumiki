import { z } from 'zod';
import { ResourceTypeSchema } from '../inputTypeSchemas/ResourceTypeSchema'
import { PermissionActionSchema } from '../inputTypeSchemas/PermissionActionSchema'

/////////////////////////////////////////
// RESOURCE ACCESS CONTROL SCHEMA
/////////////////////////////////////////

/**
 * 特定リソースへのアクセス制御
 * @namespace Organization
 */
export const ResourceAccessControlSchema = z.object({
  /**
   * リソースタイプ
   */
  resourceType: ResourceTypeSchema,
  /**
   * 許可されたアクション
   */
  allowedActions: PermissionActionSchema.array(),
  /**
   * 拒否されたアクション　(※許可よりも拒否が優先される)
   */
  deniedActions: PermissionActionSchema.array(),
  id: z.string().cuid(),
  /**
   * 組織ID
   */
  organizationId: z.string(),
  /**
   * リソースID
   */
  resourceId: z.string(),
  /**
   * 対象メンバー（nullの場合はグループまたはすべてのメンバー）
   */
  memberId: z.string().nullable(),
  /**
   * 対象グループ（nullの場合はメンバー個人またはすべてのメンバー）
   */
  groupId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type ResourceAccessControl = z.infer<typeof ResourceAccessControlSchema>

/////////////////////////////////////////
// RESOURCE ACCESS CONTROL OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const ResourceAccessControlOptionalDefaultsSchema = ResourceAccessControlSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type ResourceAccessControlOptionalDefaults = z.infer<typeof ResourceAccessControlOptionalDefaultsSchema>

export default ResourceAccessControlSchema;
