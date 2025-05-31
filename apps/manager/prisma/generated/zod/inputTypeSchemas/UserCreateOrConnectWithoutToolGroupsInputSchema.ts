import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserCreateWithoutToolGroupsInputSchema } from './UserCreateWithoutToolGroupsInputSchema';
import { UserUncheckedCreateWithoutToolGroupsInputSchema } from './UserUncheckedCreateWithoutToolGroupsInputSchema';

export const UserCreateOrConnectWithoutToolGroupsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutToolGroupsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedCreateWithoutToolGroupsInputSchema) ]),
}).strict();

export default UserCreateOrConnectWithoutToolGroupsInputSchema;
