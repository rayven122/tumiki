import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserUpdateWithoutOrganizationsInputSchema } from './UserUpdateWithoutOrganizationsInputSchema';
import { UserUncheckedUpdateWithoutOrganizationsInputSchema } from './UserUncheckedUpdateWithoutOrganizationsInputSchema';
import { UserCreateWithoutOrganizationsInputSchema } from './UserCreateWithoutOrganizationsInputSchema';
import { UserUncheckedCreateWithoutOrganizationsInputSchema } from './UserUncheckedCreateWithoutOrganizationsInputSchema';
import { UserWhereInputSchema } from './UserWhereInputSchema';

export const UserUpsertWithoutOrganizationsInputSchema: z.ZodType<Prisma.UserUpsertWithoutOrganizationsInput> = z.object({
  update: z.union([ z.lazy(() => UserUpdateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutOrganizationsInputSchema) ]),
  create: z.union([ z.lazy(() => UserCreateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedCreateWithoutOrganizationsInputSchema) ]),
  where: z.lazy(() => UserWhereInputSchema).optional()
}).strict();

export default UserUpsertWithoutOrganizationsInputSchema;
