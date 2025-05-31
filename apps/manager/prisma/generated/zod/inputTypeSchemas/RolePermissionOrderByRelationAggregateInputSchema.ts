import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const RolePermissionOrderByRelationAggregateInputSchema: z.ZodType<Prisma.RolePermissionOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default RolePermissionOrderByRelationAggregateInputSchema;
