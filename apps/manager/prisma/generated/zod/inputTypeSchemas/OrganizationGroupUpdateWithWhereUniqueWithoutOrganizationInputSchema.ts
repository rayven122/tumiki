import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithoutOrganizationInputSchema } from './OrganizationGroupUpdateWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedUpdateWithoutOrganizationInputSchema';

export const OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateWithWhereUniqueWithoutOrganizationInputSchema;
