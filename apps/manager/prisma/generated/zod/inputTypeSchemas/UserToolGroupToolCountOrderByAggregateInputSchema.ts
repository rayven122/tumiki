import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserToolGroupToolCountOrderByAggregateInputSchema: z.ZodType<Prisma.UserToolGroupToolCountOrderByAggregateInput> = z.object({
  userMcpServerConfigId: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  toolId: z.lazy(() => SortOrderSchema).optional(),
  sortOrder: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserToolGroupToolCountOrderByAggregateInputSchema;
