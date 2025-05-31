import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleCreateWithoutMembersInputSchema } from './OrganizationRoleCreateWithoutMembersInputSchema';
import { OrganizationRoleUncheckedCreateWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateWithoutMembersInputSchema';

export const OrganizationRoleCreateOrConnectWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationRoleCreateOrConnectWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationRoleCreateOrConnectWithoutMembersInputSchema;
