import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutRolesInputSchema } from './OrganizationMemberUpdateWithoutRolesInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutRolesInputSchema } from './OrganizationMemberUncheckedUpdateWithoutRolesInputSchema';

export const OrganizationMemberUpdateWithWhereUniqueWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateWithWhereUniqueWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutRolesInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateWithWhereUniqueWithoutRolesInputSchema;
