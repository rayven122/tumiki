import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema';

export const OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema: z.ZodType<Prisma.OrganizationInvitationCreateOrConnectWithoutInvitedByUserInput> = z.object({
  where: z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema) ]),
}).strict();

export default OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema;
