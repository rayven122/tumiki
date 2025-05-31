import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const ToolCountOutputTypeSelectSchema: z.ZodType<Prisma.ToolCountOutputTypeSelect> = z.object({
  mcpServerConfigs: z.boolean().optional(),
  toolGroupTools: z.boolean().optional(),
}).strict();

export default ToolCountOutputTypeSelectSchema;
