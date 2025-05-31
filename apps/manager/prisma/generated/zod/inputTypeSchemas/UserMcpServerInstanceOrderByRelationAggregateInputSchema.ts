import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserMcpServerInstanceOrderByRelationAggregateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserMcpServerInstanceOrderByRelationAggregateInputSchema;
