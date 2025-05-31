import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { StringNullableListFilterSchema } from './StringNullableListFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';
import { ToolListRelationFilterSchema } from './ToolListRelationFilterSchema';
import { UserMcpServerConfigListRelationFilterSchema } from './UserMcpServerConfigListRelationFilterSchema';

export const McpServerWhereInputSchema: z.ZodType<Prisma.McpServerWhereInput> = z.object({
  AND: z.union([ z.lazy(() => McpServerWhereInputSchema),z.lazy(() => McpServerWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => McpServerWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => McpServerWhereInputSchema),z.lazy(() => McpServerWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  iconPath: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  command: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  args: z.lazy(() => StringNullableListFilterSchema).optional(),
  envVars: z.lazy(() => StringNullableListFilterSchema).optional(),
  isPublic: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  tools: z.lazy(() => ToolListRelationFilterSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigListRelationFilterSchema).optional()
}).strict();

export default McpServerWhereInputSchema;
