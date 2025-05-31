import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserMcpServerInstanceToolGroupOrderByRelationAggregateInputSchema;
