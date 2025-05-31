import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { NestedEnumServerStatusWithAggregatesFilterSchema } from './NestedEnumServerStatusWithAggregatesFilterSchema';
import { NestedIntFilterSchema } from './NestedIntFilterSchema';
import { NestedEnumServerStatusFilterSchema } from './NestedEnumServerStatusFilterSchema';

export const EnumServerStatusWithAggregatesFilterSchema: z.ZodType<Prisma.EnumServerStatusWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ServerStatusSchema).optional(),
  in: z.lazy(() => ServerStatusSchema).array().optional(),
  notIn: z.lazy(() => ServerStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ServerStatusSchema),z.lazy(() => NestedEnumServerStatusWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumServerStatusFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumServerStatusFilterSchema).optional()
}).strict();

export default EnumServerStatusWithAggregatesFilterSchema;
