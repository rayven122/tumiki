import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { EnumResourceTypeFilterSchema } from './EnumResourceTypeFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { EnumPermissionActionFilterSchema } from './EnumPermissionActionFilterSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const RolePermissionScalarWhereInputSchema: z.ZodType<Prisma.RolePermissionScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => RolePermissionScalarWhereInputSchema),z.lazy(() => RolePermissionScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => RolePermissionScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RolePermissionScalarWhereInputSchema),z.lazy(() => RolePermissionScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  roleId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  action: z.union([ z.lazy(() => EnumPermissionActionFilterSchema),z.lazy(() => PermissionActionSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default RolePermissionScalarWhereInputSchema;
