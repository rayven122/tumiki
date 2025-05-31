import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';
import { OrganizationInvitationUpdateWithoutOrganizationInputSchema } from './OrganizationInvitationUpdateWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedUpdateWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedUpdateWithoutOrganizationInputSchema';
import { OrganizationInvitationCreateWithoutOrganizationInputSchema } from './OrganizationInvitationCreateWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema';

export const OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInput> = z.object({
  where: z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),
  update: z.union([ z.lazy(() => OrganizationInvitationUpdateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUncheckedUpdateWithoutOrganizationInputSchema) ]),
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema) ]),
}).strict();

export default OrganizationInvitationUpsertWithWhereUniqueWithoutOrganizationInputSchema;
