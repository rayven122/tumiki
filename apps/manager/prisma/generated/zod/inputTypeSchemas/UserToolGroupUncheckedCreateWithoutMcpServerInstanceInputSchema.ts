import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema';

export const UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedCreateWithoutMcpServerInstanceInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  userId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema).optional()
}).strict();

export default UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema;
