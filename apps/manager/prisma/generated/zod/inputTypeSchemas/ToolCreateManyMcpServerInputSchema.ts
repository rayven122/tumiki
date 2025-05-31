import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { JsonNullValueInputSchema } from './JsonNullValueInputSchema';
import { InputJsonValueSchema } from './InputJsonValueSchema';

export const ToolCreateManyMcpServerInputSchema: z.ZodType<Prisma.ToolCreateManyMcpServerInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValueSchema ]),
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default ToolCreateManyMcpServerInputSchema;
