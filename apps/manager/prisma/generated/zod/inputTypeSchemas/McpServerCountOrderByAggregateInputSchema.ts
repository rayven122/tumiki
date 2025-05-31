import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';

export const McpServerCountOrderByAggregateInputSchema: z.ZodType<Prisma.McpServerCountOrderByAggregateInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.lazy(() => SortOrderSchema).optional(),
  command: z.lazy(() => SortOrderSchema).optional(),
  args: z.lazy(() => SortOrderSchema).optional(),
  envVars: z.lazy(() => SortOrderSchema).optional(),
  isPublic: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional()
}).strict();

export default McpServerCountOrderByAggregateInputSchema;
