import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';
import { OrganizationMemberUpdateManyMutationInputSchema } from './OrganizationMemberUpdateManyMutationInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutGroupsInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutGroupsInputSchema';

export const OrganizationMemberUpdateManyWithWhereWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyWithWhereWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationMemberScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateManyMutationInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateManyWithWhereWithoutGroupsInputSchema;
