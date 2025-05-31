import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerTypeSchema } from './ServerTypeSchema';
import { NestedEnumServerTypeWithAggregatesFilterSchema } from './NestedEnumServerTypeWithAggregatesFilterSchema';
import { NestedIntFilterSchema } from './NestedIntFilterSchema';
import { NestedEnumServerTypeFilterSchema } from './NestedEnumServerTypeFilterSchema';

export const EnumServerTypeWithAggregatesFilterSchema: z.ZodType<Prisma.EnumServerTypeWithAggregatesFilter> = z.object({
  equals: z.lazy(() => ServerTypeSchema).optional(),
  in: z.lazy(() => ServerTypeSchema).array().optional(),
  notIn: z.lazy(() => ServerTypeSchema).array().optional(),
  not: z.union([ z.lazy(() => ServerTypeSchema),z.lazy(() => NestedEnumServerTypeWithAggregatesFilterSchema) ]).optional(),
  _count: z.lazy(() => NestedIntFilterSchema).optional(),
  _min: z.lazy(() => NestedEnumServerTypeFilterSchema).optional(),
  _max: z.lazy(() => NestedEnumServerTypeFilterSchema).optional()
}).strict();

export default EnumServerTypeWithAggregatesFilterSchema;
