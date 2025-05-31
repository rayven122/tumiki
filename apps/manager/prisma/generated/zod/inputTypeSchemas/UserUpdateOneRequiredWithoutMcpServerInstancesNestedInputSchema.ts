import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutMcpServerInstancesInputSchema } from './UserCreateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedCreateWithoutMcpServerInstancesInputSchema } from './UserUncheckedCreateWithoutMcpServerInstancesInputSchema';
import { UserCreateOrConnectWithoutMcpServerInstancesInputSchema } from './UserCreateOrConnectWithoutMcpServerInstancesInputSchema';
import { UserUpsertWithoutMcpServerInstancesInputSchema } from './UserUpsertWithoutMcpServerInstancesInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema } from './UserUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema';
import { UserUpdateWithoutMcpServerInstancesInputSchema } from './UserUpdateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedUpdateWithoutMcpServerInstancesInputSchema } from './UserUncheckedUpdateWithoutMcpServerInstancesInputSchema';

export const UserUpdateOneRequiredWithoutMcpServerInstancesNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutMcpServerInstancesNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerInstancesInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutMcpServerInstancesInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutMcpServerInstancesInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUpdateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMcpServerInstancesInputSchema) ]).optional(),
}).strict();

export default UserUpdateOneRequiredWithoutMcpServerInstancesNestedInputSchema;
