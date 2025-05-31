import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const OrganizationRoleOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrganizationRoleOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default OrganizationRoleOrderByRelationAggregateInputSchema;
