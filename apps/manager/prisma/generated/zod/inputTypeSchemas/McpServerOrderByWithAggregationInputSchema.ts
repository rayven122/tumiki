import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { McpServerCountOrderByAggregateInputSchema } from './McpServerCountOrderByAggregateInputSchema';
import { McpServerMaxOrderByAggregateInputSchema } from './McpServerMaxOrderByAggregateInputSchema';
import { McpServerMinOrderByAggregateInputSchema } from './McpServerMinOrderByAggregateInputSchema';

export const McpServerOrderByWithAggregationInputSchema: z.ZodType<Prisma.McpServerOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  command: z.lazy(() => SortOrderSchema).optional(),
  args: z.lazy(() => SortOrderSchema).optional(),
  envVars: z.lazy(() => SortOrderSchema).optional(),
  isPublic: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => McpServerCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => McpServerMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => McpServerMinOrderByAggregateInputSchema).optional()
}).strict();

export default McpServerOrderByWithAggregationInputSchema;
