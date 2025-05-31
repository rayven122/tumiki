import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateManyUserInputSchema } from './OrganizationMemberCreateManyUserInputSchema';

export const OrganizationMemberCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.OrganizationMemberCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationMemberCreateManyUserInputSchema),z.lazy(() => OrganizationMemberCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationMemberCreateManyUserInputEnvelopeSchema;
