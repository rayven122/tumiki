import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolCreateNestedManyWithoutMcpServerConfigsInputSchema } from './ToolCreateNestedManyWithoutMcpServerConfigsInputSchema';
import { McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema } from './McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema';
import { UserCreateNestedOneWithoutMcpServerConfigsInputSchema } from './UserCreateNestedOneWithoutMcpServerConfigsInputSchema';
import { OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema } from './OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema';

export const UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateWithoutUserToolGroupToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  tools: z.lazy(() => ToolCreateNestedManyWithoutMcpServerConfigsInputSchema).optional(),
  mcpServer: z.lazy(() => McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMcpServerConfigsInputSchema),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema).optional()
}).strict();

export default UserMcpServerConfigCreateWithoutUserToolGroupToolsInputSchema;
