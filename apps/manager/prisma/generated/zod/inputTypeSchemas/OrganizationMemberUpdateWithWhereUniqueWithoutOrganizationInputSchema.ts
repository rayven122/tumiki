import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberUpdateWithoutOrganizationInputSchema } from './OrganizationMemberUpdateWithoutOrganizationInputSchema';
import { OrganizationMemberUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedUpdateWithoutOrganizationInputSchema';

export const OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationMemberUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationMemberUpdateWithWhereUniqueWithoutOrganizationInputSchema;
