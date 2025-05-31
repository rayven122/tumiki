import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { JsonNullValueInputSchema } from './JsonNullValueInputSchema';
import { InputJsonValueSchema } from './InputJsonValueSchema';
import { McpServerCreateNestedOneWithoutToolsInputSchema } from './McpServerCreateNestedOneWithoutToolsInputSchema';
import { UserMcpServerConfigCreateNestedManyWithoutToolsInputSchema } from './UserMcpServerConfigCreateNestedManyWithoutToolsInputSchema';

export const ToolCreateWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.ToolCreateWithoutToolGroupToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  inputSchema: z.union([ z.lazy(() => JsonNullValueInputSchema),InputJsonValueSchema ]),
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServer: z.lazy(() => McpServerCreateNestedOneWithoutToolsInputSchema),
  mcpServerConfigs: z.lazy(() => UserMcpServerConfigCreateNestedManyWithoutToolsInputSchema).optional()
}).strict();

export default ToolCreateWithoutToolGroupToolsInputSchema;
