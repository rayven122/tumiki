import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { UserMcpServerInstanceCountOrderByAggregateInputSchema } from './UserMcpServerInstanceCountOrderByAggregateInputSchema';
import { UserMcpServerInstanceMaxOrderByAggregateInputSchema } from './UserMcpServerInstanceMaxOrderByAggregateInputSchema';
import { UserMcpServerInstanceMinOrderByAggregateInputSchema } from './UserMcpServerInstanceMinOrderByAggregateInputSchema';

export const UserMcpServerInstanceOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  serverStatus: z.lazy(() => SortOrderSchema).optional(),
  serverType: z.lazy(() => SortOrderSchema).optional(),
  toolGroupId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserMcpServerInstanceCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserMcpServerInstanceMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserMcpServerInstanceMinOrderByAggregateInputSchema).optional()
}).strict();

export default UserMcpServerInstanceOrderByWithAggregationInputSchema;
