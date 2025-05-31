import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutOrganizationsInputSchema } from './UserCreateWithoutOrganizationsInputSchema';
import { UserUncheckedCreateWithoutOrganizationsInputSchema } from './UserUncheckedCreateWithoutOrganizationsInputSchema';
import { UserCreateOrConnectWithoutOrganizationsInputSchema } from './UserCreateOrConnectWithoutOrganizationsInputSchema';
import { UserUpsertWithoutOrganizationsInputSchema } from './UserUpsertWithoutOrganizationsInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserUpdateToOneWithWhereWithoutOrganizationsInputSchema } from './UserUpdateToOneWithWhereWithoutOrganizationsInputSchema';
import { UserUpdateWithoutOrganizationsInputSchema } from './UserUpdateWithoutOrganizationsInputSchema';
import { UserUncheckedUpdateWithoutOrganizationsInputSchema } from './UserUncheckedUpdateWithoutOrganizationsInputSchema';

export const UserUpdateOneRequiredWithoutOrganizationsNestedInputSchema: z.ZodType<Prisma.UserUpdateOneRequiredWithoutOrganizationsNestedInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedCreateWithoutOrganizationsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutOrganizationsInputSchema).optional(),
  upsert: z.lazy(() => UserUpsertWithoutOrganizationsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional(),
  update: z.union([ z.lazy(() => UserUpdateToOneWithWhereWithoutOrganizationsInputSchema),z.lazy(() => UserUpdateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutOrganizationsInputSchema) ]).optional(),
}).strict();

export default UserUpdateOneRequiredWithoutOrganizationsNestedInputSchema;
