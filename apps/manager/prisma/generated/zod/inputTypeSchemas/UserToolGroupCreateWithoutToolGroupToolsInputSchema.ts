import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema';
import { UserCreateNestedOneWithoutToolGroupsInputSchema } from './UserCreateNestedOneWithoutToolGroupsInputSchema';
import { OrganizationCreateNestedOneWithoutToolGroupsInputSchema } from './OrganizationCreateNestedOneWithoutToolGroupsInputSchema';
import { UserMcpServerInstanceToolGroupCreateNestedManyWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateNestedManyWithoutToolGroupInputSchema';

export const UserToolGroupCreateWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.UserToolGroupCreateWithoutToolGroupToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutToolGroupsInputSchema),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutToolGroupsInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupCreateNestedManyWithoutToolGroupInputSchema).optional()
}).strict();

export default UserToolGroupCreateWithoutToolGroupToolsInputSchema;
