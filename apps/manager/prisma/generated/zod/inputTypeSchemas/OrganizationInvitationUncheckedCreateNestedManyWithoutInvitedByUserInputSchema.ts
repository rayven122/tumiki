import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema } from './OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema';
import { OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema } from './OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema';
import { OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema } from './OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema';
import { OrganizationInvitationWhereUniqueInputSchema } from './OrganizationInvitationWhereUniqueInputSchema';

export const OrganizationInvitationUncheckedCreateNestedManyWithoutInvitedByUserInputSchema: z.ZodType<Prisma.OrganizationInvitationUncheckedCreateNestedManyWithoutInvitedByUserInput> = z.object({
  create: z.union([ z.lazy(() => OrganizationInvitationCreateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationCreateWithoutInvitedByUserInputSchema).array(),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationUncheckedCreateWithoutInvitedByUserInputSchema).array() ]).optional(),
  connectOrCreate: z.union([ z.lazy(() => OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationCreateOrConnectWithoutInvitedByUserInputSchema).array() ]).optional(),
  createMany: z.lazy(() => OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema).optional(),
  connect: z.union([ z.lazy(() => OrganizationInvitationWhereUniqueInputSchema),z.lazy(() => OrganizationInvitationWhereUniqueInputSchema).array() ]).optional(),
}).strict();

export default OrganizationInvitationUncheckedCreateNestedManyWithoutInvitedByUserInputSchema;
