import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema';
import { UserCreateNestedOneWithoutMcpServerInstancesInputSchema } from './UserCreateNestedOneWithoutMcpServerInstancesInputSchema';
import { OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema } from './OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema';

export const UserMcpServerInstanceCreateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateWithoutToolGroupInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().optional().nullable(),
  serverStatus: z.lazy(() => ServerStatusSchema),
  serverType: z.lazy(() => ServerTypeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutMcpServerInstancesInputSchema),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema).optional()
}).strict();

export default UserMcpServerInstanceCreateWithoutToolGroupInputSchema;
