import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';
import { NestedIntFilterSchema } from './NestedIntFilterSchema';
import { NestedEnumPermissionActionFilterSchema } from './NestedEnumPermissionActionFilterSchema';

export const NestedEnumPermissionActionWithAggregatesFilterSchema: z.ZodType<Prisma.NestedEnumPermissionActionWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PermissionActionSchema).optional(),
  in: z.lazy(() => PermissionActionSchema).array().optional(),
  notIn: z.lazy(() => PermissionActionSchema).array().optional(),
  not: z.union([ z.lazy(() => PermissionActionSchema),z.lazy(() => NestedEnumPermissionActionWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPermissionActionFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPermissionActionFilterSchema).optional()
}).strict();

export default NestedEnumPermissionActionWithAggregatesFilterSchema;
