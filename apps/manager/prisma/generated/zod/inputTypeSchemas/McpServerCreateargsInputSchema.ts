import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const McpServerCreateargsInputSchema: z.ZodType<Prisma.McpServerCreateargsInput> = z.object({
  set: z.string().array()
}).strict();

export default McpServerCreateargsInputSchema;
