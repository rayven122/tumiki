import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutGroupsInputSchema } from './OrganizationMemberUpdateWithoutGroupsInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutGroupsInputSchema } from './OrganizationMemberUncheckedUpdateWithoutGroupsInputSchema';

export const OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutGroupsInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateWithWhereUniqueWithoutGroupsInputSchema;
