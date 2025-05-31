import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserMcpServerInstanceToolGroupCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCountOrderByAggregateInput> = z.object({
  mcpServerInstanceId: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  sortOrder: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupCountOrderByAggregateInputSchema;
