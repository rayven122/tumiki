import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { OrganizationGroupCountOrderByAggregateInputSchema } from './OrganizationGroupCountOrderByAggregateInputSchema';
import { OrganizationGroupMaxOrderByAggregateInputSchema } from './OrganizationGroupMaxOrderByAggregateInputSchema';
import { OrganizationGroupMinOrderByAggregateInputSchema } from './OrganizationGroupMinOrderByAggregateInputSchema';

export const OrganizationGroupOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrganizationGroupOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => OrganizationGroupCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrganizationGroupMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrganizationGroupMinOrderByAggregateInputSchema).optional()
}).strict();

export default OrganizationGroupOrderByWithAggregationInputSchema;
