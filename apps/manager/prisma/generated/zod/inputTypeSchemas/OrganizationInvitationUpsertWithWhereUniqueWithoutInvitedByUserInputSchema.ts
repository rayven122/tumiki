import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationUpdateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUpdateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUncheckedUpdateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedUpdateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema';

export const OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInputSchema: z.ZodType<Prisma.OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInput> = z.object({
  where: z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationInvitationUpdateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUncheckedUpdateWithoutInvitedByUserInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema) ]),
}).strict();

export default OrganizationInvitationUpsertWithWhereUniqueWithoutInvitedByUserInputSchema;
