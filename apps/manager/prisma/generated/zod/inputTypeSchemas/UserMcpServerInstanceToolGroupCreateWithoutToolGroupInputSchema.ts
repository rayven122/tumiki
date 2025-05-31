import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateWithoutToolGroupInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema)
}).strict();

export default UserMcpServerInstanceToolGroupCreateWithoutToolGroupInputSchema;
