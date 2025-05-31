import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereInputSchema } from './UserWhereInputSchema';
import { UserUpdateWithoutOrganizationsInputSchema } from './UserUpdateWithoutOrganizationsInputSchema';
import { UserUncheckedUpdateWithoutOrganizationsInputSchema } from './UserUncheckedUpdateWithoutOrganizationsInputSchema';

export const UserUpdateToOneWithWhereWithoutOrganizationsInputSchema: z.ZodType<Prisma.UserUpdateToOneWithWhereWithoutOrganizationsInput> = z.object({
  where: z.lazy(() => UserWhereInputSchema).optional(),
  data: z.union([ z.lazy(() => UserUpdateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedUpdateWithoutOrganizationsInputSchema) ]),
}).strict();

export default UserUpdateToOneWithWhereWithoutOrganizationsInputSchema;
