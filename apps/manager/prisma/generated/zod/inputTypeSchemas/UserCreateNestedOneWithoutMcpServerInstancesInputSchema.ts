import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutMcpServerInstancesInputSchema } from './UserCreateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedCreateWithoutMcpServerInstancesInputSchema } from './UserUncheckedCreateWithoutMcpServerInstancesInputSchema';
import { UserCreateOrConnectWithoutMcpServerInstancesInputSchema } from './UserCreateOrConnectWithoutMcpServerInstancesInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';

export const UserCreateNestedOneWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutMcpServerInstancesInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerInstancesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMcpServerInstancesInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export default UserCreateNestedOneWithoutMcpServerInstancesInputSchema;
