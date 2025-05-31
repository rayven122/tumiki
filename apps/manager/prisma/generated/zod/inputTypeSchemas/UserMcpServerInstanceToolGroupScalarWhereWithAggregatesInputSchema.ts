import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { IntWithAggregatesFilterSchema } from './IntWithAggregatesFilterSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  mcpServerInstanceId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  sortOrder: z.union([ z.lazy(() => IntWithAggregatesFilterSchema),z.number() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema;
