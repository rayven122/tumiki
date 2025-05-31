import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserUpdateWithoutToolGroupsInputSchema } from './UserUpdateWithoutToolGroupsInputSchema';
import { UserUncheckedUpdateWithoutToolGroupsInputSchema } from './UserUncheckedUpdateWithoutToolGroupsInputSchema';
import { UserCreateWithoutToolGroupsInputSchema } from './UserCreateWithoutToolGroupsInputSchema';
import { UserUncheckedCreateWithoutToolGroupsInputSchema } from './UserUncheckedCreateWithoutToolGroupsInputSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';

export const UserUpsertWithoutToolGroupsInputSchema: z.ZodType<Prisma.UserUpsertWithoutToolGroupsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutToolGroupsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedCreateWithoutToolGroupsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export default UserUpsertWithoutToolGroupsInputSchema;
