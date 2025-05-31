import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { UserUpdateWithoutMcpServerConfigsInputSchema } from './UserUpdateWithoutMcpServerConfigsInputSchema';
import { UserUncheckedUpdateWithoutMcpServerConfigsInputSchema } from './UserUncheckedUpdateWithoutMcpServerConfigsInputSchema';

export const UserUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutMcpServerConfigsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutMcpServerConfigsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMcpServerConfigsInputSchema) ]),
}).strict();

export default UserUpdateToOneWithWhereWithoutMcpServerConfigsInputSchema;
