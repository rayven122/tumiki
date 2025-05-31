import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema';

export const UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  userId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema).optional()
}).strict();

export default UserToolGroupUncheckedCreateWithoutMcpServerInstanceToolGroupsInputSchema;
