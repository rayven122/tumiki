import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationGroupCreateManyOrganizationInputSchema } from './OrganizationGroupCreateManyOrganizationInputSchema';

export const OrganizationGroupCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.OrganizationGroupCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationGroupCreateManyOrganizationInputSchema),z.lazy(() => OrganizationGroupCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationGroupCreateManyOrganizationInputEnvelopeSchema;
