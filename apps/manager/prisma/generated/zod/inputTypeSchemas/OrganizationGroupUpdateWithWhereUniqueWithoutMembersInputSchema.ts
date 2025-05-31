import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithoutMembersInputSchema } from './OrganizationGroupUpdateWithoutMembersInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutMembersInputSchema } from './OrganizationGroupUncheckedUpdateWithoutMembersInputSchema';

export const OrganizationGroupUpdateWithWhereUniqueWithoutMembersInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateWithWhereUniqueWithoutMembersInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutMembersInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutMembersInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateWithWhereUniqueWithoutMembersInputSchema;
