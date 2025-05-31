import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';
import { UserToolGroupUpdateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUpdateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema';

export const UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserToolGroupUpdateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema) ]),
}).strict();

export default UserToolGroupUpdateToOneWithWhereWithoutMcpServerInstanceInputSchema;
