import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleScalarWhereInputSchema } from './OrganizationRoleScalarWhereInputSchema';
import { OrganizationRoleUpdateManyMutationInputSchema } from './OrganizationRoleUpdateManyMutationInputSchema';
import { OrganizationRoleUncheckedUpdateManyWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedUpdateManyWithoutOrganizationInputSchema';

export const OrganizationRoleUpdateManyWithWhereWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateManyWithWhereWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationRoleScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateManyMutationInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateManyWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateManyWithWhereWithoutOrganizationInputSchema;
