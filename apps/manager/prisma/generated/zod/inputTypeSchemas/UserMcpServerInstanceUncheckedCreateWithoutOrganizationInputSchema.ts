import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema';

export const UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUncheckedCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().optional().nullable(),
  serverStatus: z.lazy(() => ServerStatusSchema),
  serverType: z.lazy(() => ServerTypeSchema),
  toolGroupId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema).optional()
}).strict();

export default UserMcpServerInstanceUncheckedCreateWithoutOrganizationInputSchema;
