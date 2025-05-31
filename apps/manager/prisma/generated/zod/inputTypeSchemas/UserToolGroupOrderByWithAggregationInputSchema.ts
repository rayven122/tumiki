import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { UserToolGroupCountOrderByAggregateInputSchema } from './UserToolGroupCountOrderByAggregateInputSchema';
import { UserToolGroupMaxOrderByAggregateInputSchema } from './UserToolGroupMaxOrderByAggregateInputSchema';
import { UserToolGroupMinOrderByAggregateInputSchema } from './UserToolGroupMinOrderByAggregateInputSchema';

export const UserToolGroupOrderByWithAggregationInputSchema: z.ZodType<Prisma.UserToolGroupOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  isEnabled: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => UserToolGroupCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => UserToolGroupMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => UserToolGroupMinOrderByAggregateInputSchema).optional()
}).strict();

export default UserToolGroupOrderByWithAggregationInputSchema;
