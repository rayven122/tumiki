import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema';
import { McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema } from './McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema';
import { UserCreateNestedOneWithoutMcpServerConfigsInputSchema } from './UserCreateNestedOneWithoutMcpServerConfigsInputSchema';
import { OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema } from './OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema';

export const UserMcpServerConfigCreateWithoutToolsInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateWithoutToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  userToolGroupTools: z.lazy(() => UserToolGroupToolCreateNestedManyWithoutUserMcpServerConfigInputSchema).optional(),
  mcpServer: z.lazy(() => McpServerCreateNestedOneWithoutMcpServerConfigsInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMcpServerConfigsInputSchema),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMcpServerConfigsInputSchema).optional()
}).strict();

export default UserMcpServerConfigCreateWithoutToolsInputSchema;
