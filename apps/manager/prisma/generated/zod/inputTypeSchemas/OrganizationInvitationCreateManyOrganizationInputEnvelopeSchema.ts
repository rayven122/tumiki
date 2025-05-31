import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationInvitationCreateManyOrganizationInputSchema } from './OrganizationInvitationCreateManyOrganizationInputSchema';

export const OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.OrganizationInvitationCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationInvitationCreateManyOrganizationInputSchema),z.lazy(() => OrganizationInvitationCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationInvitationCreateManyOrganizationInputEnvelopeSchema;
