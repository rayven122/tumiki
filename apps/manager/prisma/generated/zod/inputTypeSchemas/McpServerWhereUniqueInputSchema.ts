import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableListFilterSchema } from './StringNullableListFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { ToolListRelationFilterSchema } from './ToolListRelationFilterSchema';
import { UserMcpServerConfigListRelationFilterSchema } from './UserMcpServerConfigListRelationFilterSchema';

export const McpServerWhereUniqueInputSchema: z.ZodType<Prisma.McpServerWhereUniqueInput> = z.union([
  z.object({
    id: z.string(),
    name: z.string()
  }),
  z.object({
    id: z.string(),
  }),
  z.object({
    name: z.string(),
  }),
])
.and(z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  AND: z.union([ z.lazy(() => McpServerWhereInputSchema),z.lazy(() => McpServerWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => McpServerWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => McpServerWhereInputSchema),z.lazy(() => McpServerWhereInputSchema).array() ]).optional(),
  iconPath: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  command: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  args: z.lazy(() => StringNullableListFilterSchema).optional(),
  envVars: z.lazy(() => StringNullableListFilterSchema).optional(),
  isPublic: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  tools: z.lazy(() => ToolListRelationFilterSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigListRelationFilterSchema).optional()
}).strict());

export default McpServerWhereUniqueInputSchema;
