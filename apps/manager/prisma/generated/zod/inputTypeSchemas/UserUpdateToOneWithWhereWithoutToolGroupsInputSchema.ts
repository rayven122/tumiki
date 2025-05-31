import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { UserUpdateWithoutToolGroupsInputSchema } from './UserUpdateWithoutToolGroupsInputSchema';
import { UserUncheckedUpdateWithoutToolGroupsInputSchema } from './UserUncheckedUpdateWithoutToolGroupsInputSchema';

export const UserUpdateToOneWithWhereWithoutToolGroupsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutToolGroupsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutToolGroupsInputSchema) ]),
}).strict();

export default UserUpdateToOneWithWhereWithoutToolGroupsInputSchema;
