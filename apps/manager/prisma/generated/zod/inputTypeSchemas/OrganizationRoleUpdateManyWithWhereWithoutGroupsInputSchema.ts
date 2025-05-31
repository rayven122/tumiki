import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleScalarWhereInputSchema } from './OrganizationRoleScalarWhereInputSchema';
import { OrganizationRoleUpdateManyMutationInputSchema } from './OrganizationRoleUpdateManyMutationInputSchema';
import { OrganizationRoleUncheckedUpdateManyWithoutGroupsInputSchema } from './OrganizationRoleUncheckedUpdateManyWithoutGroupsInputSchema';

export const OrganizationRoleUpdateManyWithWhereWithoutGroupsInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateManyWithWhereWithoutGroupsInput> = z.object({
  where: z.lazy(() => OrganizationRoleScalarWhereInputSchema),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateManyMutationInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateManyWithoutGroupsInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateManyWithWhereWithoutGroupsInputSchema;
