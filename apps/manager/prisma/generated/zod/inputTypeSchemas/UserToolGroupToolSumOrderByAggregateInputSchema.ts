import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserToolGroupToolSumOrderByAggregateInputSchema: z.ZodType<Prisma.UserToolGroupToolSumOrderByAggregateInput> = z.object({
  sortOrder: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserToolGroupToolSumOrderByAggregateInputSchema;
