import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolMcpServerIdNameCompoundUniqueInputSchema } from './ToolMcpServerIdNameCompoundUniqueInputSchema';
import { ToolWhereInputSchema } from './ToolWhereInputSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { JsonFilterSchema } from './JsonFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { McpServerScalarRelationFilterSchema } from './McpServerScalarRelationFilterSchema';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';
import { UserMcpServerConfigListRelationFilterSchema } from './UserMcpServerConfigListRelationFilterSchema';
import { UserToolGroupToolListRelationFilterSchema } from './UserToolGroupToolListRelationFilterSchema';

export const ToolWhereUniqueInputSchema: z.ZodType<Prisma.ToolWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    mcpServerId_name: z.lazy(() => ToolMcpServerIdNameCompoundUniqueInputSchema)
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    mcpServerId_name: z.lazy(() => ToolMcpServerIdNameCompoundUniqueInputSchema),
  }),
])
.and(z.object({
  id: z.string().optional(),
  mcpServerId_name: z.lazy(() => ToolMcpServerIdNameCompoundUniqueInputSchema).optional(),
  AND: z.union([ z.lazy(() => ToolWhereInputSchema),z.lazy(() => ToolWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ToolWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ToolWhereInputSchema),z.lazy(() => ToolWhereInputSchema).array() ]).optional(),
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
}).strict());

export default ToolWhereUniqueInputSchema;
