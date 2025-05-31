import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { RolePermissionCountOrderByAggregateInputSchema } from './RolePermissionCountOrderByAggregateInputSchema';
import { RolePermissionMaxOrderByAggregateInputSchema } from './RolePermissionMaxOrderByAggregateInputSchema';
import { RolePermissionMinOrderByAggregateInputSchema } from './RolePermissionMinOrderByAggregateInputSchema';

export const RolePermissionOrderByWithAggregationInputSchema: z.ZodType<Prisma.RolePermissionOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  roleId: z.lazy(() => SortOrderSchema).optional(),
  resourceType: z.lazy(() => SortOrderSchema).optional(),
  action: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => RolePermissionCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => RolePermissionMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => RolePermissionMinOrderByAggregateInputSchema).optional()
}).strict();

export default RolePermissionOrderByWithAggregationInputSchema;
