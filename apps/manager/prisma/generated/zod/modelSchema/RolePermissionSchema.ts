import { z } from 'zod';
import { ResourceTypeSchema } from '../inputTypeSchemas/ResourceTypeSchema'
import { PermissionActionSchema } from '../inputTypeSchemas/PermissionActionSchema'

/////////////////////////////////////////
// ROLE PERMISSION SCHEMA
/////////////////////////////////////////

/**
 * ロールに付与された権限
 * @namespace Organization
 */
export const RolePermissionSchema = z.object({
  /**
   * リソースタイプ
   */
  resourceType: ResourceTypeSchema,
  /**
   * 権限アクション
   */
  action: PermissionActionSchema,
  id: z.string().cuid(),
  /**
   * ロールID
   */
  roleId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type RolePermission = z.infer<typeof RolePermissionSchema>

/////////////////////////////////////////
// ROLE PERMISSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const RolePermissionOptionalDefaultsSchema = RolePermissionSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type RolePermissionOptionalDefaults = z.infer<typeof RolePermissionOptionalDefaultsSchema>

export default RolePermissionSchema;
