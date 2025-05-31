import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigCreateWithoutMcpServerInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema';

export const UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateOrConnectWithoutMcpServerInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutMcpServerInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutMcpServerInputSchema) ]),
}).strict();

export default UserMcpServerConfigCreateOrConnectWithoutMcpServerInputSchema;
