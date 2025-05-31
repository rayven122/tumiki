import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { ResourceAccessControlCountOrderByAggregateInputSchema } from './ResourceAccessControlCountOrderByAggregateInputSchema';
import { ResourceAccessControlMaxOrderByAggregateInputSchema } from './ResourceAccessControlMaxOrderByAggregateInputSchema';
import { ResourceAccessControlMinOrderByAggregateInputSchema } from './ResourceAccessControlMinOrderByAggregateInputSchema';

export const ResourceAccessControlOrderByWithAggregationInputSchema: z.ZodType<Prisma.ResourceAccessControlOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  resourceType: z.lazy(() => SortOrderSchema).optional(),
  resourceId: z.lazy(() => SortOrderSchema).optional(),
  memberId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  groupId: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  allowedActions: z.lazy(() => SortOrderSchema).optional(),
  deniedActions: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ResourceAccessControlCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ResourceAccessControlMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ResourceAccessControlMinOrderByAggregateInputSchema).optional()
}).strict();

export default ResourceAccessControlOrderByWithAggregationInputSchema;
