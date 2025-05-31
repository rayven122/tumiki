import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { SortOrderSchema } from './SortOrderSchema';
import { McpServerOrderByWithRelationInputSchema } from './McpServerOrderByWithRelationInputSchema';
import { UserMcpServerConfigOrderByRelationAggregateInputSchema } from './UserMcpServerConfigOrderByRelationAggregateInputSchema';
import { UserToolGroupToolOrderByRelationAggregateInputSchema } from './UserToolGroupToolOrderByRelationAggregateInputSchema';

export const ToolOrderByWithRelationInputSchema: z.ZodType<Prisma.ToolOrderByWithRelationInput> = z.object({
  id: z.lazy(() => SortOrderSchema).optional(),
  name: z.lazy(() => SortOrderSchema).optional(),
  description: z.lazy(() => SortOrderSchema).optional(),
  inputSchema: z.lazy(() => SortOrderSchema).optional(),
  isEnabled: z.lazy(() => SortOrderSchema).optional(),
  mcpServerId: z.lazy(() => SortOrderSchema).optional(),
  createdAt: z.lazy(() => SortOrderSchema).optional(),
  updatedAt: z.lazy(() => SortOrderSchema).optional(),
  mcpServer: z.lazy(() => McpServerOrderByWithRelationInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigOrderByRelationAggregateInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolOrderByRelationAggregateInputSchema).optional()
}).strict();

export default ToolOrderByWithRelationInputSchema;
