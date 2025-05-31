import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';
import { UserCreateWithoutOrganizationsInputSchema } from './UserCreateWithoutOrganizationsInputSchema';
import { UserUncheckedCreateWithoutOrganizationsInputSchema } from './UserUncheckedCreateWithoutOrganizationsInputSchema';

export const UserCreateOrConnectWithoutOrganizationsInputSchema: z.ZodType<Prisma.UserCreateOrConnectWithoutOrganizationsInput> = z.object({
  where: z.lazy(() => UserWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => UserCreateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedCreateWithoutOrganizationsInputSchema) ]),
}).strict();

export default UserCreateOrConnectWithoutOrganizationsInputSchema;
