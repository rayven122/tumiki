import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';
import { OrganizationMemberUpdateManyMutationInputSchema } from './OrganizationMemberUpdateManyMutationInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutRolesInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutRolesInputSchema';

export const OrganizationMemberUpdateManyWithWhereWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyWithWhereWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationMemberScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateManyMutationInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateManyWithWhereWithoutRolesInputSchema;
