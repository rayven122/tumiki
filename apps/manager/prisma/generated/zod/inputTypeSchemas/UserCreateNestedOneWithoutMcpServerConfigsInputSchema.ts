import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutMcpServerConfigsInputSchema } from './UserCreateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedCreateWithoutMcpServerConfigsInputSchema } from './UserUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { UserCreateOrConnectWithoutMcpServerConfigsInputSchema } from './UserCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';

export const UserCreateNestedOneWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutMcpServerConfigsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerConfigsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMcpServerConfigsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export default UserCreateNestedOneWithoutMcpServerConfigsInputSchema;
