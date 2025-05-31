import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigWhereUniqueInputSchema } from './UserMcpServerConfigWhereUniqueInputSchema';
import { UserMcpServerConfigCreateWithoutUserInputSchema } from './UserMcpServerConfigCreateWithoutUserInputSchema';
import { UserMcpServerConfigUncheckedCreateWithoutUserInputSchema } from './UserMcpServerConfigUncheckedCreateWithoutUserInputSchema';

export const UserMcpServerConfigCreateOrConnectWithoutUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateOrConnectWithoutUserInput> = z.object({
  where: z.lazy(() => UserMcpServerConfigWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserMcpServerConfigCreateWithoutUserInputSchema),z.lazy(() => UserMcpServerConfigUncheckedCreateWithoutUserInputSchema) ]),
}).strict();

export default UserMcpServerConfigCreateOrConnectWithoutUserInputSchema;
