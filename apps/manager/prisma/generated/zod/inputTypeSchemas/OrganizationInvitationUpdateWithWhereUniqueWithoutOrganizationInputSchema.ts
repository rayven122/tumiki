import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationUpdateWithoutOrganizationInputSchema } from './OrganizationInvitationUpdateWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedUpdateWithoutOrganizationInputSchema';

export const OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationInvitationUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUncheckedUpdateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationInvitationUpdateWithWhereUniqueWithoutOrganizationInputSchema;
