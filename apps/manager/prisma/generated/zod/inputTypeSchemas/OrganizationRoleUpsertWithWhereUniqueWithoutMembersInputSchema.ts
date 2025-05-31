import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithoutMembersInputSchema } from './OrganizationRoleUpdateWithoutMembersInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutMembersInputSchema } from './OrganizationRoleUncheckedUpdateWithoutMembersInputSchema';
import { OrganizationRoleCreateWithoutMembersInputSchema } from './OrganizationRoleCreateWithoutMembersInputSchema';
import { OrganizationRoleUncheckedCreateWithoutMembersInputSchema } from './OrganizationRoleUncheckedCreateWithoutMembersInputSchema';

export const OrganizationRoleUpsertWithWhereUniqueWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationRoleUpsertWithWhereUniqueWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutMembersInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationRoleUpsertWithWhereUniqueWithoutMembersInputSchema;
