import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema } from './ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema';
import { UserToolGroupToolUncheckedCreateNestedManyWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolUncheckedCreateNestedManyWithoutUserMcpServerConfigInputSchema';

export const UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigUncheckedCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  mcpServerId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolUncheckedCreateNestedManyWithoutMcpServerConfigsInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolUncheckedCreateNestedManyWithoutUserMcpServerConfigInputSchema).optional()
}).strict();

export default UserMcpServerConfigUncheckedCreateWithoutOrganizationInputSchema;
