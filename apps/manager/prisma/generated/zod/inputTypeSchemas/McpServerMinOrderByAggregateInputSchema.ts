import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const McpServerMinOrderByAggregateInputSchema: z.ZodType<Prisma.McpServerMinOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.lazy(() => SortOrderSchema).optional(),
  command: z.lazy(() => SortOrderSchema).optional(),
  isPublic: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default McpServerMinOrderByAggregateInputSchema;
