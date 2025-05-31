import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { EnumResourceTypeWithAggregatesFilterSchema } from './EnumResourceTypeWithAggregatesFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { EnumPermissionActionWithAggregatesFilterSchema } from './EnumPermissionActionWithAggregatesFilterSchema';
import { PermissionActionSchema } from './PermissionActionSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const RolePermissionScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.RolePermissionScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => RolePermissionScalarWhereWithAggregatesInputSchema),z.lazy(() => RolePermissionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => RolePermissionScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => RolePermissionScalarWhereWithAggregatesInputSchema),z.lazy(() => RolePermissionScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  roleId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeWithAggregatesFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  action: z.union([ z.lazy(() => EnumPermissionActionWithAggregatesFilterSchema),z.lazy(() => PermissionActionSchema) ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default RolePermissionScalarWhereWithAggregatesInputSchema;
