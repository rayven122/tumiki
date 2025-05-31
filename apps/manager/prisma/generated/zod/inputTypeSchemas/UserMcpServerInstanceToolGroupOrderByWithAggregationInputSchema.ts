import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { UserMcpServerInstanceToolGroupCountOrderByAggregateInputSchema } from './UserMcpServerInstanceToolGroupCountOrderByAggregateInputSchema';
import { UserMcpServerInstanceToolGroupAvgOrderByAggregateInputSchema } from './UserMcpServerInstanceToolGroupAvgOrderByAggregateInputSchema';
import { UserMcpServerInstanceToolGroupMaxOrderByAggregateInputSchema } from './UserMcpServerInstanceToolGroupMaxOrderByAggregateInputSchema';
import { UserMcpServerInstanceToolGroupMinOrderByAggregateInputSchema } from './UserMcpServerInstanceToolGroupMinOrderByAggregateInputSchema';
import { UserMcpServerInstanceToolGroupSumOrderByAggregateInputSchema } from './UserMcpServerInstanceToolGroupSumOrderByAggregateInputSchema';

export const UserMcpServerInstanceToolGroupOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupOrderByWithAggregationInput> = z.object({
  mcpServerInstanceId: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  sortOrder: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserMcpServerInstanceToolGroupCountOrderByAggregateInputSchema).optional(),
  _avg: z.lazy(() => UserMcpServerInstanceToolGroupAvgOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMcpServerInstanceToolGroupMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMcpServerInstanceToolGroupMinOrderByAggregateInputSchema).optional(),
  _sum: z.lazy(() => UserMcpServerInstanceToolGroupSumOrderByAggregateInputSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupOrderByWithAggregationInputSchema;
