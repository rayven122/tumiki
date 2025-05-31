import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationInvitationUpdategroupIdsInputSchema: z.ZodType<Prisma.OrganizationInvitationUpdategroupIdsInput> = z.object({
  set: z.string().array().optional(),
  push: z.union([ z.string(),z.string().array() ]).optional(),
}).strict();

export default OrganizationInvitationUpdategroupIdsInputSchema;
