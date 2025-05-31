import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema } from './RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema';
import { RolePermissionWhereInputSchema } from './RolePermissionWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { EnumResourceTypeFilterSchema } from './EnumResourceTypeFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { EnumPermissionActionFilterSchema } from './EnumPermissionActionFilterSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationRoleScalarRelationFilterSchema } from './OrganizationRoleScalarRelationFilterSchema';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';

export const RolePermissionWhereUniqueInputSchema: z.ZodType<Prisma.RolePermissionWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    roleId_resourceType_action: z.lazy(() => RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    roleId_resourceType_action: z.lazy(() => RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  roleId_resourceType_action: z.lazy(() => RolePermissionRoleIdResourceTypeActionCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => RolePermissionWhereInputSchema),z.lazy(() => RolePermissionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RolePermissionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RolePermissionWhereInputSchema),z.lazy(() => RolePermissionWhereInputSchema).array() ]).optional(),
  roleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  action: z.union([ z.lazy(() => EnumPermissionActionFilterSchema),z.lazy(() => PermissionActionSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  role: z.union([ z.lazy(() => OrganizationRoleScalarRelationFilterSchema),z.lazy(() => OrganizationRoleWhereInputSchema) ]).optional(),
}).strict());

export default RolePermissionWhereUniqueInputSchema;
