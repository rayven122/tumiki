import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleUpdateWithoutOrganizationInputSchema } from './OrganizationRoleUpdateWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedUpdateWithoutOrganizationInputSchema';

export const OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationRoleUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationRoleUpdateWithWhereUniqueWithoutOrganizationInputSchema;
