import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationMemberCreateManyOrganizationInputSchema } from './OrganizationMemberCreateManyOrganizationInputSchema';

export const OrganizationMemberCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.OrganizationMemberCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationMemberCreateManyOrganizationInputSchema),z.lazy(() => OrganizationMemberCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationMemberCreateManyOrganizationInputEnvelopeSchema;
