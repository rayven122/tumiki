import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';

export const NestedEnumServerStatusFilterSchema: z.ZodType<Prisma.NestedEnumServerStatusFilter> = z.object({
  equals: z.lazy(() => ServerStatusSchema).optional(),
  in: z.lazy(() => ServerStatusSchema).array().optional(),
  notIn: z.lazy(() => ServerStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ServerStatusSchema),z.lazy(() => NestedEnumServerStatusFilterSchema) ]).optional(),
}).strict();

export default NestedEnumServerStatusFilterSchema;
