import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { UserToolGroupToolCountOrderByAggregateInputSchema } from './UserToolGroupToolCountOrderByAggregateInputSchema';
import { UserToolGroupToolAvgOrderByAggregateInputSchema } from './UserToolGroupToolAvgOrderByAggregateInputSchema';
import { UserToolGroupToolMaxOrderByAggregateInputSchema } from './UserToolGroupToolMaxOrderByAggregateInputSchema';
import { UserToolGroupToolMinOrderByAggregateInputSchema } from './UserToolGroupToolMinOrderByAggregateInputSchema';
import { UserToolGroupToolSumOrderByAggregateInputSchema } from './UserToolGroupToolSumOrderByAggregateInputSchema';

export const UserToolGroupToolOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserToolGroupToolOrderByWithAggregationInput> = z.object({
  userMcpServerConfigId: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  toolId: z.lazy(() => SortOrderSchema).optional(),
  sortOrder: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserToolGroupToolCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => UserToolGroupToolAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserToolGroupToolMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserToolGroupToolMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => UserToolGroupToolSumOrderByAggregateInputSchema).optional()
}).strict();

export default UserToolGroupToolOrderByWithAggregationInputSchema;
