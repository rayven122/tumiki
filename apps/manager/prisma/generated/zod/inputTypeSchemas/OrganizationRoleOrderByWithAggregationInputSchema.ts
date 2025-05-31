import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { OrganizationRoleCountOrderByAggregateInputSchema } from './OrganizationRoleCountOrderByAggregateInputSchema';
import { OrganizationRoleMaxOrderByAggregateInputSchema } from './OrganizationRoleMaxOrderByAggregateInputSchema';
import { OrganizationRoleMinOrderByAggregateInputSchema } from './OrganizationRoleMinOrderByAggregateInputSchema';

export const OrganizationRoleOrderByWithAggregationInputSchema: z.ZodType<Prisma.OrganizationRoleOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  organizationId: z.lazy(() => SortOrderSchema).optional(),
  isDefault: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => OrganizationRoleCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => OrganizationRoleMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => OrganizationRoleMinOrderByAggregateInputSchema).optional()
}).strict();

export default OrganizationRoleOrderByWithAggregationInputSchema;
