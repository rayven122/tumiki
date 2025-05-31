import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';
import { OrganizationMemberUpdateManyMutationInputSchema } from './OrganizationMemberUpdateManyMutationInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutOrganizationInputSchema';

export const OrganizationMemberUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationMemberScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateManyMutationInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateManyWithWhereWithoutOrganizationInputSchema;
