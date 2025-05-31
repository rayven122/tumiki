import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { EnumResourceTypeFilterSchema } from './EnumResourceTypeFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { EnumPermissionActionFilterSchema } from './EnumPermissionActionFilterSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { OrganizationRoleScalarRelationFilterSchema } from './OrganizationRoleScalarRelationFilterSchema';
import { OrganizationRoleWhereInputSchema } from './OrganizationRoleWhereInputSchema';

export const RolePermissionWhereInputSchema: z.ZodType<Prisma.RolePermissionWhereInput> = z.object({
  AND: z.union([ z.lazy(() => RolePermissionWhereInputSchema),z.lazy(() => RolePermissionWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RolePermissionWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RolePermissionWhereInputSchema),z.lazy(() => RolePermissionWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  roleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  action: z.union([ z.lazy(() => EnumPermissionActionFilterSchema),z.lazy(() => PermissionActionSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  role: z.union([ z.lazy(() => OrganizationRoleScalarRelationFilterSchema),z.lazy(() => OrganizationRoleWhereInputSchema) ]).optional(),
}).strict();

export default RolePermissionWhereInputSchema;
