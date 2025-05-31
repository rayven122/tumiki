import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema } from './UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema';
import { UserCreateNestedOneWithoutToolGroupsInputSchema } from './UserCreateNestedOneWithoutToolGroupsInputSchema';
import { UserToolGroupToolCreateNestedManyWithoutToolGroupInputSchema } from './UserToolGroupToolCreateNestedManyWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupCreateNestedManyWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateNestedManyWithoutToolGroupInputSchema';

export const UserToolGroupCreateWithoutOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupCreateWithoutOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceCreateNestedOneWithoutToolGroupInputSchema).optional(),
  user: z.lazy(() => UserCreateNestedOneWithoutToolGroupsInputSchema),
  toolGroupTools: z.lazy(() => UserToolGroupToolCreateNestedManyWithoutToolGroupInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupCreateNestedManyWithoutToolGroupInputSchema).optional()
}).strict();

export default UserToolGroupCreateWithoutOrganizationInputSchema;
