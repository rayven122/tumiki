import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateNestedManyWithoutMcpServerConfigsInputSchema } from './ToolCreateNestedManyWithoutMcpServerConfigsInputSchema';
import { UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema';
import { McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema } from './McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema';
import { UserCreateNestedOneWithoutMcpServerConfigsInputSchema } from './UserCreateNestedOneWithoutMcpServerConfigsInputSchema';

export const UserMcpServerConfigCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolCreateNestedManyWithoutMcpServerConfigsInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema).optional(),
  mcpServer: z.lazy(() => McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMcpServerConfigsInputSchema)
}).strict();

export default UserMcpServerConfigCreateWithoutOrganizationInputSchema;
