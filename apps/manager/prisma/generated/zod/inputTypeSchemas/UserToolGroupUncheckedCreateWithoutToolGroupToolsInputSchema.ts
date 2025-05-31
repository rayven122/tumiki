import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema } from './UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema';
import { UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema } from './UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema';

export const UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema: z.ZodType<Prisma.UserToolGroupUncheckedCreateWithoutToolGroupToolsInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  userId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceUncheckedCreateNestedOneWithoutToolGroupInputSchema).optional(),
  mcpServerInstanceToolGroups: z.lazy(() => UserMcpServerInstanceToolGroupUncheckedCreateNestedManyWithoutToolGroupInputSchema).optional()
}).strict();

export default UserToolGroupUncheckedCreateWithoutToolGroupToolsInputSchema;
