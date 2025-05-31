import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const OrganizationMemberOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrganizationMemberOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default OrganizationMemberOrderByRelationAggregateInputSchema;
