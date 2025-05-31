import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { PermissionActionSchema } from './PermissionActionSchema';
import { NestedEnumPermissionActionWithAggregatesFilterSchema } from './NestedEnumPermissionActionWithAggregatesFilterSchema';
import { NestedIntFilterSchema } from './NestedIntFilterSchema';
import { NestedEnumPermissionActionFilterSchema } from './NestedEnumPermissionActionFilterSchema';

export const EnumPermissionActionWithAggregatesFilterSchema: z.ZodType<Prisma.EnumPermissionActionWithAggregatesFilter> = z.object({
  equals: z.lazy(() => PermissionActionSchema).optional(),
  in: z.lazy(() => PermissionActionSchema).array().optional(),
  notIn: z.lazy(() => PermissionActionSchema).array().optional(),
  not: z.union([ z.lazy(() => PermissionActionSchema),z.lazy(() => NestedEnumPermissionActionWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumPermissionActionFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumPermissionActionFilterSchema).optional()
}).strict();

export default EnumPermissionActionWithAggregatesFilterSchema;
