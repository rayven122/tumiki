import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationUpdateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUpdateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUncheckedUpdateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedUpdateWithoutInvitedByUserInputSchema';

export const OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInputSchema: z.ZodType<Prisma.OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInput> = z.object({
  where: z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),
  data: z.union([ z.lazy(() => OrganizationInvitationUpdateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUncheckedUpdateWithoutInvitedByUserInputSchema) ]),
}).strict();

export default OrganizationInvitationUpdateWithWhereUniqueWithoutInvitedByUserInputSchema;
