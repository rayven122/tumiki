import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberScalarWhereInputSchema } from './OrganizationMemberScalarWhereInputSchema';
import { OrganizationMemberUpdateManyMutationInputSchema } from './OrganizationMemberUpdateManyMutationInputSchema';
import { OrganizationMemberUncheckedUpdateManyWithoutUserInputSchema } from './OrganizationMemberUncheckedUpdateManyWithoutUserInputSchema';

export const OrganizationMemberUpdateManyWithWhereWithoutUserInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateManyWithWhereWithoutUserInput> = z.object({
  where: z.lazy(() => OrganizationMemberScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateManyMutationInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateManyWithoutUserInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateManyWithWhereWithoutUserInputSchema;
