import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateWithoutOrganizationInputSchema } from './OrganizationInvitationCreateWithoutOrganizationInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema } from './OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema';
import { OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema } from './OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema';
import { OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema } from './OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';

export const OrganizationInvitationCreateNestedManyWithoutOrganizationInputSchema: z.ZodType<Prisma.OrganizationInvitationCreateNestedManyWithoutOrganizationInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationCreateWithoutOrganizationInputSchema).array(),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutOrganizationInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema),z.lazy(() => OrganizationInvitationCreateOrConnectWithoutOrganizationInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationInvitationCreateNestedManyWithoutOrganizationInputSchema;
