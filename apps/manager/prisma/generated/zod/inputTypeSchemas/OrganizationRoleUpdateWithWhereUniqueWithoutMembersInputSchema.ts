import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithoutMembersInputSchema } from './OrganizationRoleUpdateWithoutMembersInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutMembersInputSchema } from './OrganizationRoleUncheckedUpdateWithoutMembersInputSchema';

export const OrganizationRoleUpdateWithWhereUniqueWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateWithWhereUniqueWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutMembersInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateWithWhereUniqueWithoutMembersInputSchema;
