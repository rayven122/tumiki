import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const OrganizationInvitationOrderByRelationAggregateInputSchema: z.ZodType<Prisma.OrganizationInvitationOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default OrganizationInvitationOrderByRelationAggregateInputSchema;
