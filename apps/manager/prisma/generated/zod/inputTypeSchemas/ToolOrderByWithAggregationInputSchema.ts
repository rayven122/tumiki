import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { ToolCountOrderByAggregateInputSchema } from './ToolCountOrderByAggregateInputSchema';
import { ToolMaxOrderByAggregateInputSchema } from './ToolMaxOrderByAggregateInputSchema';
import { ToolMinOrderByAggregateInputSchema } from './ToolMinOrderByAggregateInputSchema';

export const ToolOrderByWithAggregationInputSchema: z.ZodType<Prisma.ToolOrderByWithAggregationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  inputSchema: z.lazy(() => SortOrderSchema).optional(),
  isEnabled: z.lazy(() => SortOrderSchema).optional(),
  mcpServerId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  _count: z.lazy(() => ToolCountOrderByAggregateInputSchema).optional(),
  _max: z.lazy(() => ToolMaxOrderByAggregateInputSchema).optional(),
  _min: z.lazy(() => ToolMinOrderByAggregateInputSchema).optional()
}).strict();

export default ToolOrderByWithAggregationInputSchema;
