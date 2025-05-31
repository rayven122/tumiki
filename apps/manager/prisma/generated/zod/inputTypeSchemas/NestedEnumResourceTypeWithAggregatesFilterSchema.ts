import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceTypeSchema } from './ResourceTypeSchema';
import { NestedIntFilterSchema } from './NestedIntFilterSchema';
import { NestedEnumResourceTypeFilterSchema } from './NestedEnumResourceTypeFilterSchema';

export const NestedEnumResourceTypeWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumResourceTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ResourceTypeSchema).optional(),
  in: z.lazy(() => ResourceTypeSchema).array().optional(),
  notIn: z.lazy(() => ResourceTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ResourceTypeSchema),z.lazy(() => NestedEnumResourceTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumResourceTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumResourceTypeFilterSchema).optional()
}).strict();

export default NestedEnumResourceTypeWithAggregatesFilterSchema;
