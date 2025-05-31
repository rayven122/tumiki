import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupWhereUniqueInputSchema } from './OrganizationGroupWhereUniqueInputSchema';
import { OrganizationGroupCreateWithoutOrganizationInputSchema } from './OrganizationGroupCreateWithoutOrganizationInputSchema';
import { OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationGroupWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationGroupCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationGroupUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationGroupCreateOrConnectWithoutOrganizationInputSchema;
