import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';
import { UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema';
import { UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema } from './UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema';

export const UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema: z.ZodType<Prisma.UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserToolGroupUpdateWithoutMcpServerInstanceToolGroupsInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutMcpServerInstanceToolGroupsInputSchema) ]),
}).strict();

export default UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceToolGroupsInputSchema;
