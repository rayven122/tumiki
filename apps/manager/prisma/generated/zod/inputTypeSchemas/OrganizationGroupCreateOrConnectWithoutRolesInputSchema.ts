import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupCreateWithoutRolesInputSchema } from './OrganizationGroupCreateWithoutRolesInputSchema';
import { OrganizationGroupUncheckedCreateWithoutRolesInputSchema } from './OrganizationGroupUncheckedCreateWithoutRolesInputSchema';

export const OrganizationGroupCreateOrConnectWithoutRolesInputSchema: z.ZodType<Prisma.OrganizationGroupCreateOrConnectWithoutRolesInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutRolesInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutRolesInputSchema) ]),
}).strict();

export default OrganizationGroupCreateOrConnectWithoutRolesInputSchema;
