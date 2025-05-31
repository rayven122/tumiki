import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserToolGroupToolAvgOrderByAggregateInputSchema: z.ZodType<Prisma.UserToolGroupToolAvgOrderByAggregateInput> = z.object({
  sortOrder: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserToolGroupToolAvgOrderByAggregateInputSchema;
