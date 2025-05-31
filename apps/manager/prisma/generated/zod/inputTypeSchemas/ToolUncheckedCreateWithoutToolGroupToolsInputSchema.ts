import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { JsonNullValueInputSchema } from './JsonNullValueInputSchema';
import { InputJsonValueSchema } from './InputJsonValueSchema';
import { UserMcpServerConfigUncheckedCreateNestedManyWithoutToolsInputSchema } from './UserMcpServerConfigUncheckedCreateNestedManyWithoutToolsInputSchema';

export const ToolUncheckedCreateWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.ToolUncheckedCreateWithoutToolGroupToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValueSchema ]),
  isEnabled: z.boolean().optional(),
  mcpServerId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigUncheckedCreateNestedManyWithoutToolsInputSchema).optional()
}).strict();

export default ToolUncheckedCreateWithoutToolGroupToolsInputSchema;
