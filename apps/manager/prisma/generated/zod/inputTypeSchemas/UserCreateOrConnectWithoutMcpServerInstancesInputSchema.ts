import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserCreateWithoutMcpServerInstancesInputSchema } from './UserCreateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedCreateWithoutMcpServerInstancesInputSchema } from './UserUncheckedCreateWithoutMcpServerInstancesInputSchema';

export const UserCreateOrConnectWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutMcpServerInstancesInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerInstancesInputSchema) ]),
}).strict();

export default UserCreateOrConnectWithoutMcpServerInstancesInputSchema;
