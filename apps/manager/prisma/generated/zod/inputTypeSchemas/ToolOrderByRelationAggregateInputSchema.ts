import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const ToolOrderByRelationAggregateInputSchema: z.ZodType<Prisma.ToolOrderByRelationAggregateInput> = z.object({
  _count: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default ToolOrderByRelationAggregateInputSchema;
