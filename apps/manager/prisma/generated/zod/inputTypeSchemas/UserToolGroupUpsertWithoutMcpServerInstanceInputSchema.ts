import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupUpdateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUpdateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupWhereInputSchema } from './UserToolGroupWhereInputSchema';

export const UserToolGroupUpsertWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserToolGroupUpsertWithoutMcpServerInstanceInput> = z.object({
  update: z.union([ z.lazy(() => UserToolGroupUpdateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedUpdateWithoutMcpServerInstanceInputSchema) ]),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema) ]),
  where: z.lazy(() => UserToolGroupWhereInputSchema).optional()
}).strict();

export default UserToolGroupUpsertWithoutMcpServerInstanceInputSchema;
