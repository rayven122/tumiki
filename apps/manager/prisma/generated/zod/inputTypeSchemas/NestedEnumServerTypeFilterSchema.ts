import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerTypeSchema } from './ServerTypeSchema';

export const NestedEnumServerTypeFilterSchema: z.ZodType<Prisma.NestedEnumServerTypeFilter> = z.object({
  equals: z.lazy(() => ServerTypeSchema).optional(),
  in: z.lazy(() => ServerTypeSchema).array().optional(),
  notIn: z.lazy(() => ServerTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ServerTypeSchema),z.lazy(() => NestedEnumServerTypeFilterSchema) ]).optional(),
}).strict();

export default NestedEnumServerTypeFilterSchema;
