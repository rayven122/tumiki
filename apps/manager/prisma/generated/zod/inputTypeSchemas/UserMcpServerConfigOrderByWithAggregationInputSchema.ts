import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { UserMcpServerConfigCountOrderByAggregateInputSchema } from './UserMcpServerConfigCountOrderByAggregateInputSchema';
import { UserMcpServerConfigMaxOrderByAggregateInputSchema } from './UserMcpServerConfigMaxOrderByAggregateInputSchema';
import { UserMcpServerConfigMinOrderByAggregateInputSchema } from './UserMcpServerConfigMinOrderByAggregateInputSchema';

export const UserMcpServerConfigOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserMcpServerConfigOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  envVars: z.lazy(() => SortOrderSchema).optional(),
  mcpServerId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserMcpServerConfigCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMcpServerConfigMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMcpServerConfigMinOrderByAggregateInputSchema).optional()
}).strict();

export default UserMcpServerConfigOrderByWithAggregationInputSchema;
