import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateargsInputSchema } from './McpServerCreateargsInputSchema';
import { McpServerCreateenvVarsInputSchema } from './McpServerCreateenvVarsInputSchema';
import { UserMcpServerConfigCreateNestedManyWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateNestedManyWithoutMcpServerInputSchema';

export const McpServerCreateWithoutToolsInputSchema: z.ZodType<Prisma.McpServerCreateWithoutToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  iconPath: z.string().optional().nullable(),
  command: z.string(),
  args: z.union([ z.lazy(() => McpServerCreateargsInputSchema),z.string().array() ]).optional(),
  envVars: z.union([ z.lazy(() => McpServerCreateenvVarsInputSchema),z.string().array() ]).optional(),
  isPublic: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigCreateNestedManyWithoutMcpServerInputSchema).optional()
}).strict();

export default McpServerCreateWithoutToolsInputSchema;
