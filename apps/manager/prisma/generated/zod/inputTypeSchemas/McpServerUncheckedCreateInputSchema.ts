import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateargsInputSchema } from './McpServerCreateargsInputSchema';
import { McpServerCreateenvVarsInputSchema } from './McpServerCreateenvVarsInputSchema';
import { ToolUncheckedCreateNestedManyWithoutMcpServerInputSchema } from './ToolUncheckedCreateNestedManyWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedCreateNestedManyWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedCreateNestedManyWithoutMcpServerInputSchema';

export const McpServerUncheckedCreateInputSchema: z.ZodType<Prisma.McpServerUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  iconPath: z.string().optional().nullable(),
  command: z.string(),
  args: z.union([ z.lazy(() => McpServerCreateargsInputSchema),z.string().array() ]).optional(),
  envVars: z.union([ z.lazy(() => McpServerCreateenvVarsInputSchema),z.string().array() ]).optional(),
  isPublic: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolUncheckedCreateNestedManyWithoutMcpServerInputSchema).optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedCreateNestedManyWithoutMcpServerInputSchema).optional()
}).strict();

export default McpServerUncheckedCreateInputSchema;
