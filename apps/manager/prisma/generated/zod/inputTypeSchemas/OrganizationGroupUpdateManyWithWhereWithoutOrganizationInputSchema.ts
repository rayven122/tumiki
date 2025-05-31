import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupScalarWhereInputSchema } from './OrganizationGroupScalarWhereInputSchema';
import { OrganizationGroupUpdateManyMutationInputSchema } from './OrganizationGroupUpdateManyMutationInputSchema';
import { OrganizationGroupUncheckedUpdateManyWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedUpdateManyWithoutOrganizationInputSchema';

export const OrganizationGroupUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateManyMutationInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateManyWithWhereWithoutOrganizationInputSchema;
