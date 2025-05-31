import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { UserUpdateWithoutMcpServerInstancesInputSchema } from './UserUpdateWithoutMcpServerInstancesInputSchema';
import { UserUncheckedUpdateWithoutMcpServerInstancesInputSchema } from './UserUncheckedUpdateWithoutMcpServerInstancesInputSchema';

export const UserUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutMcpServerInstancesInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutMcpServerInstancesInputSchema),z.lazy(() => UserUncheckedUpdateWithoutMcpServerInstancesInputSchema) ]),
}).strict();

export default UserUpdateToOneWithWhereWithoutMcpServerInstancesInputSchema;
