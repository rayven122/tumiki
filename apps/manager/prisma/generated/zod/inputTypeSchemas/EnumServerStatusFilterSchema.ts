import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { NestedEnumServerStatusFilterSchema } from './NestedEnumServerStatusFilterSchema';

export const EnumServerStatusFilterSchema: z.ZodType<Prisma.EnumServerStatusFilter> = z.object({
  equals: z.lazy(() => ServerStatusSchema).optional(),
  in: z.lazy(() => ServerStatusSchema).array().optional(),
  notIn: z.lazy(() => ServerStatusSchema).array().optional(),
  not: z.union([ z.lazy(() => ServerStatusSchema),z.lazy(() => NestedEnumServerStatusFilterSchema) ]).optional(),
}).strict();

export default EnumServerStatusFilterSchema;
