import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupUpdateWithoutRolesInputSchema } from './OrganizationGroupUpdateWithoutRolesInputSchema';
import { OrganizationGroupUncheckedUpdateWithoutRolesInputSchema } from './OrganizationGroupUncheckedUpdateWithoutRolesInputSchema';

export const OrganizationGroupUpdateWithWhereUniqueWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateWithWhereUniqueWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateWithWhereUniqueWithoutRolesInputSchema;
