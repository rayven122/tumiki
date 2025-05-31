import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupScalarWhereInputSchema } from './OrganizationGroupScalarWhereInputSchema';
import { OrganizationGroupUpdateManyMutationInputSchema } from './OrganizationGroupUpdateManyMutationInputSchema';
import { OrganizationGroupUncheckedUpdateManyWithoutMembersInputSchema } from './OrganizationGroupUncheckedUpdateManyWithoutMembersInputSchema';

export const OrganizationGroupUpdateManyWithWhereWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateManyWithWhereWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateManyMutationInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateManyWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateManyWithWhereWithoutMembersInputSchema;
