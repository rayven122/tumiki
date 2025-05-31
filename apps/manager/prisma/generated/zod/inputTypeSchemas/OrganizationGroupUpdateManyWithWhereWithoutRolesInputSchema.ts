import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupScalarWhereInputSchema } from './OrganizationGroupScalarWhereInputSchema';
import { OrganizationGroupUpdateManyMutationInputSchema } from './OrganizationGroupUpdateManyMutationInputSchema';
import { OrganizationGroupUncheckedUpdateManyWithoutRolesInputSchema } from './OrganizationGroupUncheckedUpdateManyWithoutRolesInputSchema';

export const OrganizationGroupUpdateManyWithWhereWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupUpdateManyWithWhereWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationGroupScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationGroupUpdateManyMutationInputSchema),z.lazy(() => OrganizationGroupUncheckedUpdateManyWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationGroupUpdateManyWithWhereWithoutRolesInputSchema;
