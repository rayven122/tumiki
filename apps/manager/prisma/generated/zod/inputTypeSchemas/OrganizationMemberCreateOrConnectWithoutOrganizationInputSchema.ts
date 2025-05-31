import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberWhereUniqueInputSchema } from './OrganizationMemberWhereUniqueInputSchema';
import { OrganizationMemberCreateWithoutOrganizationInputSchema } from './OrganizationMemberCreateWithoutOrganizationInputSchema';
import { OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationMemberWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationMemberCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationMemberUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationMemberCreateOrConnectWithoutOrganizationInputSchema;
