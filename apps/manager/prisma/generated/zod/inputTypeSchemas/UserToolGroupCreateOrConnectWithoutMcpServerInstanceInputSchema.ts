import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupWhereUniqueInputSchema } from './UserToolGroupWhereUniqueInputSchema';
import { UserToolGroupCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupCreateWithoutMcpServerInstanceInputSchema';
import { UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema } from './UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema';

export const UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserToolGroupCreateOrConnectWithoutMcpServerInstanceInput> = z.object({
  where: z.lazy(() => UserToolGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserToolGroupCreateWithoutMcpServerInstanceInputSchema),z.lazy(() => UserToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema) ]),
}).strict();

export default UserToolGroupCreateOrConnectWithoutMcpServerInstanceInputSchema;
