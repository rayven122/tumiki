import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateManyInvitedByUserInputSchema } from './OrganizationInvitationCreateManyInvitedByUserInputSchema';

export const OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema: z.ZodType<Prisma.OrganizationInvitationCreateManyInvitedByUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationInvitationCreateManyInvitedByUserInputSchema),z.lazy(() => OrganizationInvitationCreateManyInvitedByUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationInvitationCreateManyInvitedByUserInputEnvelopeSchema;
