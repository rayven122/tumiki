import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { NestedEnumResourceTypeFilterSchema } from './NestedEnumResourceTypeFilterSchema';

export const EnumResourceTypeFilterSchema: z.ZodType<Prisma.EnumResourceTypeFilter> = z.object({
  equals: z.lazy(() => ResourceTypeSchema).optional(),
  in: z.lazy(() => ResourceTypeSchema).array().optional(),
  notIn: z.lazy(() => ResourceTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ResourceTypeSchema),z.lazy(() => NestedEnumResourceTypeFilterSchema) ]).optional(),
}).strict();

export default EnumResourceTypeFilterSchema;
