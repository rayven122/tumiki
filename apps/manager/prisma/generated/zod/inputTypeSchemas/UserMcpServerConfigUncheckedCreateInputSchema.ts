import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema } from './ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema';
import { UserToolGroupToolUncheckedCreateNestedManyWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedCreateNestedManyWithoutUserMcpServerConfigInputSchema';

export const UserMcpServerConfigUncheckedCreateInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedCreateInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  mcpServerId: z.string(),
  userId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolUncheckedCreateNestedManyWithoutUserMcpServerConfigInputSchema).optional()
}).strict();

export default UserMcpServerConfigUncheckedCreateInputSchema;
