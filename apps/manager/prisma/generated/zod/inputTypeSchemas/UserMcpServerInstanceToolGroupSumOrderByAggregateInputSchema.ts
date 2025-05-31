import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserMcpServerInstanceToolGroupSumOrderByAggregateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupSumOrderByAggregateInput> = z.object({
  sortOrder: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupSumOrderByAggregateInputSchema;
