import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema';
import { UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema } from './UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema';

export const UserToolGroupUncheckedCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  userId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema).optional(),
  toolGroupTools: z.lazy(() => UserToolGroupToolUncheckedCreateNestedManyWithoutToolGroupInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema).optional()
}).strict();

export default UserToolGroupUncheckedCreateWithoutOrganizationInputSchema;
