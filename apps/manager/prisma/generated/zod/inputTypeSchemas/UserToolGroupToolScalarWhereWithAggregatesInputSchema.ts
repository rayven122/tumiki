import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { IntWithAggregatesFilterSchema } from './IntWithAggregatesFilterSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const UserToolGroupToolScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserToolGroupToolScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserToolGroupToolScalarWhereWithAggregatesInputSchema),z.lazy(() => UserToolGroupToolScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserToolGroupToolScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserToolGroupToolScalarWhereWithAggregatesInputSchema),z.lazy(() => UserToolGroupToolScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  userMcpServerConfigId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  toolId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  sortOrder: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserToolGroupToolScalarWhereWithAggregatesInputSchema;
