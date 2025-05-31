import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { OrganizationMemberCountOrderByAggregateInputSchema } from './OrganizationMemberCountOrderByAggregateInputSchema';
import { OrganizationMemberMaxOrderByAggregateInputSchema } from './OrganizationMemberMaxOrderByAggregateInputSchema';
import { OrganizationMemberMinOrderByAggregateInputSchema } from './OrganizationMemberMinOrderByAggregateInputSchema';

export const OrganizationMemberOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrganizationMemberOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  userId: z.lazy(() => SortOrderSchema).optional(),
  isAdmin: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => OrganizationMemberCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrganizationMemberMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrganizationMemberMinOrderByAggregateInputSchema).optional()
}).strict();

export default OrganizationMemberOrderByWithAggregationInputSchema;
