import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationInvitationCreategroupIdsInputSchema: z.ZodType<Prisma.OrganizationInvitationCreategroupIdsInput> = z.object({
  set: z.string().array()
}).strict();

export default OrganizationInvitationCreategroupIdsInputSchema;
