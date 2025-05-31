import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceWhereInputSchema } from './UserMcpServerInstanceWhereInputSchema';
import { UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserMcpServerInstanceUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInput> = z.object({
  where: z.lazy(() => UserMcpServerInstanceWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserMcpServerInstanceUpdateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserMcpServerInstanceUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
}).strict();

export default UserMcpServerInstanceUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema;
