import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleWhereUniqueInputSchema } from './OrganizationRoleWhereUniqueInputSchema';
import { OrganizationRoleCreateWithoutOrganizationInputSchema } from './OrganizationRoleCreateWithoutOrganizationInputSchema';
import { OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationRoleWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationRoleCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationRoleUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationRoleCreateOrConnectWithoutOrganizationInputSchema;
