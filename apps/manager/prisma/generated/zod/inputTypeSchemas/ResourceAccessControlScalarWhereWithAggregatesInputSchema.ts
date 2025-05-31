import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { EnumResourceTypeWithAggregatesFilterSchema } from './EnumResourceTypeWithAggregatesFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { StringNullableWithAggregatesFilterSchema } from './StringNullableWithAggregatesFilterSchema';
import { EnumPermissionActionNullableListFilterSchema } from './EnumPermissionActionNullableListFilterSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const ResourceAccessControlScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.ResourceAccessControlScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => ResourceAccessControlScalarWhereWithAggregatesInputSchema),z.lazy(() => ResourceAccessControlScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => ResourceAccessControlScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ResourceAccessControlScalarWhereWithAggregatesInputSchema),z.lazy(() => ResourceAccessControlScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeWithAggregatesFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  resourceId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  memberId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  groupId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  allowedActions: z.lazy(() => EnumPermissionActionNullableListFilterSchema).optional(),
  deniedActions: z.lazy(() => EnumPermissionActionNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default ResourceAccessControlScalarWhereWithAggregatesInputSchema;
