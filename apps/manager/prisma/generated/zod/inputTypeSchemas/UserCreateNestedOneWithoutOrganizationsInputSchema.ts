import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserCreateWithoutOrganizationsInputSchema } from './UserCreateWithoutOrganizationsInputSchema';
import { UserUncheckedCreateWithoutOrganizationsInputSchema } from './UserUncheckedCreateWithoutOrganizationsInputSchema';
import { UserCreateOrConnectWithoutOrganizationsInputSchema } from './UserCreateOrConnectWithoutOrganizationsInputSchema';
import { UserWhereUniqueInputSchema } from './UserWhereUniqueInputSchema';

export const UserCreateNestedOneWithoutOrganizationsInputSchema: z.ZodType<Prisma.UserCreateNestedOneWithoutOrganizationsInput> = z.object({
  create: z.union([ z.lazy(() => UserCreateWithoutOrganizationsInputSchema),z.lazy(() => UserUncheckedCreateWithoutOrganizationsInputSchema) ]).optional(),
  connectOrCreate: z.lazy(() => UserCreateOrConnectWithoutOrganizationsInputSchema).optional(),
  connect: z.lazy(() => UserWhereUniqueInputSchema).optional()
}).strict();

export default UserCreateNestedOneWithoutOrganizationsInputSchema;
