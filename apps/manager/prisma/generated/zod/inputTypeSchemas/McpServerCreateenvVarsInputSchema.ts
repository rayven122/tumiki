import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const McpServerCreateenvVarsInputSchema: z.ZodType<Prisma.McpServerCreateenvVarsInput> = z.object({
  set: z.string().array()
}).strict();

export default McpServerCreateenvVarsInputSchema;
