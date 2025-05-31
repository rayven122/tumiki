import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutToolGroupsInputSchema } from './UserCreateWithoutToolGroupsInputSchema';
import { UserUncheckedCreateWithoutToolGroupsInputSchema } from './UserUncheckedCreateWithoutToolGroupsInputSchema';
import { UserCreateOrConnectWithoutToolGroupsInputSchema } from './UserCreateOrConnectWithoutToolGroupsInputSchema';
import { UserUpsertWithoutToolGroupsInputSchema } from './UserUpsertWithoutToolGroupsInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserUpdateToOneWithWhereWithoutToolGroupsInputSchema } from './UserUpdateToOneWithWhereWithoutToolGroupsInputSchema';
import { UserUpdateWithoutToolGroupsInputSchema } from './UserUpdateWithoutToolGroupsInputSchema';
import { UserUncheckedUpdateWithoutToolGroupsInputSchema } from './UserUncheckedUpdateWithoutToolGroupsInputSchema';

export const UserUpdateOneRequiredWithoutToolGroupsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutToolGroupsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedCreateWithoutToolGroupsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutToolGroupsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutToolGroupsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutToolGroupsInputSchema),z.lazy(() => UserUpdateWithoutToolGroupsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutToolGroupsInputSchema) ]).optional(),
}).strict();

export default UserUpdateOneRequiredWithoutToolGroupsNestedInputSchema;
