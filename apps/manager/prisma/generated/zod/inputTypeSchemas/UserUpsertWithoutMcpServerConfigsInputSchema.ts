import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserUpdateWithoutMcpServerConfigsInputSchema } from './UserUpdateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './UserUncheckedUpdateWithoutMcpServerConfigsInputSchema';
import { UserCreateWithoutMcpServerConfigsInputSchema } from './UserCreateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedCreateWithoutMcpServerConfigsInputSchema } from './UserUncheckedCreateWithoutMcpServerConfigsInputSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';

export const UserUpsertWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.UserUpsertWithoutMcpServerConfigsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedCreateWithoutMcpServerConfigsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export default UserUpsertWithoutMcpServerConfigsInputSchema;
