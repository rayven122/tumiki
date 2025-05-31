import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateManyOrganizationInputSchema } from './ResourceAccessControlCreateManyOrganizationInputSchema';

export const ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.ResourceAccessControlCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ResourceAccessControlCreateManyOrganizationInputSchema),z.lazy(() => ResourceAccessControlCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default ResourceAccessControlCreateManyOrganizationInputEnvelopeSchema;
