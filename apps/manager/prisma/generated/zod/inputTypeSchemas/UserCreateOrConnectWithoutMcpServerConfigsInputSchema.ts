import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserCreateWithoutMcpServerConfigsInputSchema } from './UserCreateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedCreateWithoutMcpServerConfigsInputSchema } from './UserUncheckedCreateWithoutMcpServerConfigsInputSchema';

export const UserCreateOrConnectWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default UserCreateOrConnectWithoutMcpServerConfigsInputSchema;
