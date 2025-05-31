import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutToolGroupsInputSchema } from './UserCreateWithoutToolGroupsInputSchema';
import { UserUncheckedCreateWithoutToolGroupsInputSchema } from './UserUncheckedCreateWithoutToolGroupsInputSchema';
import { UserCreateOrConnectWithoutToolGroupsInputSchema } from './UserCreateOrConnectWithoutToolGroupsInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';

export const UserCreateNestedOneWithoutToolGroupsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutToolGroupsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedCreateWithoutToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutToolGroupsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export default UserCreateNestedOneWithoutToolGroupsInputSchema;
