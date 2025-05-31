import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleScalarWhereInputSchema } from './OrganizationRoleScalarWhereInputSchema';
import { OrganizationRoleUpdateManyMutationInputSchema } from './OrganizationRoleUpdateManyMutationInputSchema';
import { OrganizationRoleUncheckedUpdateManyWithoutMembersInputSchema } from './OrganizationRoleUncheckedUpdateManyWithoutMembersInputSchema';

export const OrganizationRoleUpdateManyWithWhereWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateManyWithWhereWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationRoleScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateManyMutationInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateManyWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateManyWithWhereWithoutMembersInputSchema;
