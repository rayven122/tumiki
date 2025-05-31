import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserUpdateWithoutMcpServerInstancesInputSchema } from './UserUpdateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedUpdateWithoutMcpServerInstancesInputSchema } from './UserUncheckedUpdateWithoutMcpServerInstancesInputSchema';
import { UserCreateWithoutMcpServerInstancesInputSchema } from './UserCreateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedCreateWithoutMcpServerInstancesInputSchema } from './UserUncheckedCreateWithoutMcpServerInstancesInputSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';

export const UserUpsertWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.UserUpsertWithoutMcpServerInstancesInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMcpServerInstancesInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerInstancesInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export default UserUpsertWithoutMcpServerInstancesInputSchema;
