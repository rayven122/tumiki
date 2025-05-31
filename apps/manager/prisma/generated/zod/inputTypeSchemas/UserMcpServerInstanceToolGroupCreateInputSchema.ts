import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserMcpServerInstanceToolGroupCreateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateInput> = z.object({
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional(),
  mcpServerInstance: z.lazy(() => UserMcpServerInstanceCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema),
  toolGroup: z.lazy(() => UserToolGroupCreateNestedOneWithoutMcpServerInstanceToolGroupsInputSchema)
}).strict();

export default UserMcpServerInstanceToolGroupCreateInputSchema;
