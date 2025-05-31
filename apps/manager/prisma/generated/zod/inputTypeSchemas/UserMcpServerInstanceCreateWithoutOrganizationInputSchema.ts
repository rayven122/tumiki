import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema';
import { UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema';
import { UserCreateNestedOneWithoutMcpServerInstancesInputSchema } from './UserCreateNestedOneWithoutMcpServerInstancesInputSchema';

export const UserMcpServerInstanceCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().optional().nullable(),
  serverStatus: z.lazy(() => ServerStatusSchema),
  serverType: z.lazy(() => ServerTypeSchema),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema).optional(),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema),
  user: z.lazy(() => UserCreateNestedOneWithoutMcpServerInstancesInputSchema)
}).strict();

export default UserMcpServerInstanceCreateWithoutOrganizationInputSchema;
