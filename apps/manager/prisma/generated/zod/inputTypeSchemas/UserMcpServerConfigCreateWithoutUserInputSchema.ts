import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateNestedManyWithoutMcpServerConfigsInputSchema } from './ToolCreateNestedManyWithoutMcpServerConfigsInputSchema';
import { UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema';
import { McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema } from './McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema';
import { OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema } from './OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema';

export const UserMcpServerConfigCreateWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateWithoutUserInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolCreateNestedManyWithoutMcpServerConfigsInputSchema).optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema).optional(),
  mcpServer: z.lazy(() => McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema).optional()
}).strict();

export default UserMcpServerConfigCreateWithoutUserInputSchema;
