import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const McpServerCountOutputTypeSelectSchema: z.ZodType<Prisma.McpServerCountOutputTypeSelect> = z.object({
  tools: z.boolean().optional(),
  mcpServerConfigs: z.boolean().optional(),
}).strict();

export default McpServerCountOutputTypeSelectSchema;
