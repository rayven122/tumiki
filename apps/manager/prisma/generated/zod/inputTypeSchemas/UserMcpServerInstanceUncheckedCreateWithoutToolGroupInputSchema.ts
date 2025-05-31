import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ServerStatusSchema } from './ServerStatusSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema';

export const UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUncheckedCreateWithoutToolGroupInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  iconPath: z.string().optional().nullable(),
  serverStatus: z.lazy(() => ServerStatusSchema),
  serverType: z.lazy(() => ServerTypeSchema),
  userId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutMcpServerInstanceInputSchema).optional()
}).strict();

export default UserMcpServerInstanceUncheckedCreateWithoutToolGroupInputSchema;
