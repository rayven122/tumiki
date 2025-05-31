import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationInvitationCreateroleIdsInputSchema: z.ZodType<Prisma.OrganizationInvitationCreateroleIdsInput> = z.object({
  set: z.string().array()
}).strict();

export default OrganizationInvitationCreateroleIdsInputSchema;
