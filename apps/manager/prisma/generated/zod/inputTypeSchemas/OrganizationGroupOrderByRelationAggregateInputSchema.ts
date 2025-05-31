import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const OrganizationGroupOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrganizationGroupOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default OrganizationGroupOrderByRelationAggregateInputSchema;
