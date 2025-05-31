import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { SortOrderInputSchema } from './SortOrderInputSchema';
import { ToolOrderByRelationAggregateInputSchema } from './ToolOrderByRelationAggregateInputSchema';
import { UserMcpServerConfigOrderByRelationAggregateInputSchema } from './UserMcpServerConfigOrderByRelationAggregateInputSchema';

export const McpServerOrderByWithRelationInputSchema: z.ZodType<Prisma.McpServerOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  iconPath: z.union([ z.lazy(() => SortOrderSchema),z.lazy(() => SortOrderInputSchema) ]).optional(),
  command: z.lazy(() => SortOrderSchema).optional(),
  args: z.lazy(() => SortOrderSchema).optional(),
  envVars: z.lazy(() => SortOrderSchema).optional(),
  isPublic: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  tools: z.lazy(() => ToolOrderByRelationAggregateInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigOrderByRelationAggregateInputSchema).optional()
}).strict();

export default McpServerOrderByWithRelationInputSchema;
