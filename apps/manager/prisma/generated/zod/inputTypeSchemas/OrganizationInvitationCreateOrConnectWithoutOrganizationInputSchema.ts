import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationCreateWithoutOrganizationInputSchema } from './OrganizationInvitationCreateWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationInvitationCreateOrConnectWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema;
