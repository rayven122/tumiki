import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { JsonFilterSchema } from './JsonFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { McpServerScalarRelationFilterSchema } from './McpServerScalarRelationFilterSchema';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';
import { UserMcpServerConfigListRelationFilterSchema } from './UserMcpServerConfigListRelationFilterSchema';
import { UserToolGroupToolListRelationFilterSchema } from './UserToolGroupToolListRelationFilterSchema';

export const ToolWhereInputSchema: z.ZodType<Prisma.ToolWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ToolWhereInputSchema),z.lazy(() => ToolWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ToolWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ToolWhereInputSchema),z.lazy(() => ToolWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  inputSchema: z.lazy(() => JsonFilterSchema).optional(),
  isEnabled: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  mcpServerId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  mcpServer: z.union([ z.lazy(() => McpServerScalarRelationFilterSchema),z.lazy(() => McpServerWhereInputSchema) ]).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigListRelationFilterSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolListRelationFilterSchema).optional()
}).strict();

export default ToolWhereInputSchema;
