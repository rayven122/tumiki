import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserMcpServerInstanceToolGroupAvgOrderByAggregateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupAvgOrderByAggregateInput> = z.object({
  sortOrder: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupAvgOrderByAggregateInputSchema;
