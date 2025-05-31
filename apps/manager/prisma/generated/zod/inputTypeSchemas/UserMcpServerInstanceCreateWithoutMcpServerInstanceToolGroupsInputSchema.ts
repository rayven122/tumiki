import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema';
import { UserCreateNestedOneWithoutMcpServerInstancesInputSchema } from './UserCreateNestedOneWithoutMcpServerInstancesInputSchema';
import { OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema } from './OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema';

export const UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().optional().nullable(),
  serverStatus: z.lazy(() => ServerStatusSchema),
  serverType: z.lazy(() => ServerTypeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMcpServerInstancesInputSchema),
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema).optional()
}).strict();

export default UserMcpServerInstanceCreateWithoutMcpServerInstanceToolGroupsInputSchema;
