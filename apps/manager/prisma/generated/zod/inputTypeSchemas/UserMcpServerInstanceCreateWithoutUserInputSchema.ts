import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateNestedManyWithoutMcpServerInstanceInputSchema';
import { UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateNestedOneWithoutMcpServerInstanceInputSchema';
import { OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema } from './OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema';

export const UserMcpServerInstanceCreateWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateWithoutUserInput> = z.object({
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
  organization: z.lazy(() => OrganizationCreateNestedOneWithoutMcpServerInstancesInputSchema).optional()
}).strict();

export default UserMcpServerInstanceCreateWithoutUserInputSchema;
