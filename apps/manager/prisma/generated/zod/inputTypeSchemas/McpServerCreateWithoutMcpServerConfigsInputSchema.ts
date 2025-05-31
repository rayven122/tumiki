import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerCreateargsInputSchema } from './McpServerCreateargsInputSchema';
import { McpServerCreateenvVarsInputSchema } from './McpServerCreateenvVarsInputSchema';
import { ToolCreateNestedManyWithoutMcpServerInputSchema } from './ToolCreateNestedManyWithoutMcpServerInputSchema';

export const McpServerCreateWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.McpServerCreateWithoutMcpServerConfigsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  iconPath: z.string().optional().nullable(),
  command: z.string(),
  args: z.union([ z.lazy(() => McpServerCreateargsInputSchema),z.string().array() ]).optional(),
  envVars: z.union([ z.lazy(() => McpServerCreateenvVarsInputSchema),z.string().array() ]).optional(),
  isPublic: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolCreateNestedManyWithoutMcpServerInputSchema).optional()
}).strict();

export default McpServerCreateWithoutMcpServerConfigsInputSchema;
