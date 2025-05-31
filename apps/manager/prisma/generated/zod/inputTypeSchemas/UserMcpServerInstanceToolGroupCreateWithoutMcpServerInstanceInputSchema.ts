import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema)
}).strict();

export default UserMcpServerInstanceToolGroupCreateWithoutMcpServerInstanceInputSchema;
