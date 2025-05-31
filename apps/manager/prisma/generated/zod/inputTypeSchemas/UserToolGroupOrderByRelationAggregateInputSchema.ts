import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const UserToolGroupOrderByRelationAggregateInputSchema: z.ZodType<Prisma.UserToolGroupOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default UserToolGroupOrderByRelationAggregateInputSchema;
