import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutMcpServerConfigsInputSchema } from './UserCreateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedCreateWithoutMcpServerConfigsInputSchema } from './UserUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { UserCreateOrConnectWithoutMcpServerConfigsInputSchema } from './UserCreateOrConnectWithoutMcpServerConfigsInputSchema';
import { UserUpsertWithoutMcpServerConfigsInputSchema } from './UserUpsertWithoutMcpServerConfigsInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema } from './UserUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema';
import { UserUpdateWithoutMcpServerConfigsInputSchema } from './UserUpdateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './UserUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const UserUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutMcpServerConfigsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerConfigsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMcpServerConfigsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutMcpServerConfigsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]).optional(),
}).strict();

export default UserUpdateOneRequiredWithoutMcpServerConfigsNestedInputSchema;
