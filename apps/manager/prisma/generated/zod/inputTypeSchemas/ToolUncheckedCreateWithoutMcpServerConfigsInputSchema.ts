import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { JsonNullValueInputSchema } from './JsonNullValueInputSchema';
import { InputJsonValueSchema } from './InputJsonValueSchema';
import { UserToolGroupToolUncheckedCreateNestedManyWithoutToolInputSchema } from './UserToolGroupToolUncheckedCreateNestedManyWithoutToolInputSchema';

export const ToolUncheckedCreateWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.ToolUncheckedCreateWithoutMcpServerConfigsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValueSchema ]),
  isEnabled: z.boolean().optional(),
  mcpServerId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUncheckedCreateNestedManyWithoutToolInputSchema).optional()
}).strict();

export default ToolUncheckedCreateWithoutMcpServerConfigsInputSchema;
