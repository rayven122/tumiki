import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { EnumResourceTypeFilterSchema } from './EnumResourceTypeFilterSchema';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { EnumPermissionActionNullableListFilterSchema } from './EnumPermissionActionNullableListFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const ResourceAccessControlScalarWhereInputSchema: z.ZodType<Prisma.ResourceAccessControlScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ResourceAccessControlScalarWhereInputSchema),z.lazy(() => ResourceAccessControlScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ResourceAccessControlScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ResourceAccessControlScalarWhereInputSchema),z.lazy(() => ResourceAccessControlScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  resourceType: z.union([ z.lazy(() => EnumResourceTypeFilterSchema),z.lazy(() => ResourceTypeSchema) ]).optional(),
  resourceId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  memberId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  groupId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  allowedActions: z.lazy(() => EnumPermissionActionNullableListFilterSchema).optional(),
  deniedActions: z.lazy(() => EnumPermissionActionNullableListFilterSchema).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default ResourceAccessControlScalarWhereInputSchema;
