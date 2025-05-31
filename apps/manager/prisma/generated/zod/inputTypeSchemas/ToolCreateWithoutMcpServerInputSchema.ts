import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { JsonNullValueInputSchema } from './JsonNullValueInputSchema';
import { InputJsonValueSchema } from './InputJsonValueSchema';
import { UserMcpServerConfigCreateNestedManyWithoutToolsInputSchema } from './UserMcpServerConfigCreateNestedManyWithoutToolsInputSchema';
import { UserToolGroupToolCreateNestedManyWithoutToolInputSchema } from './UserToolGroupToolCreateNestedManyWithoutToolInputSchema';

export const ToolCreateWithoutMcpServerInputSchema: z.ZodType<Prisma.ToolCreateWithoutMcpServerInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValueSchema ]),
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigCreateNestedManyWithoutToolsInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolCreateNestedManyWithoutToolInputSchema).optional()
}).strict();

export default ToolCreateWithoutMcpServerInputSchema;
