import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateManyMemberInputSchema } from './ResourceAccessControlCreateManyMemberInputSchema';

export const ResourceAccessControlCreateManyMemberInputEnvelopeSchema: z.ZodType<Prisma.ResourceAccessControlCreateManyMemberInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ResourceAccessControlCreateManyMemberInputSchema),z.lazy(() => ResourceAccessControlCreateManyMemberInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default ResourceAccessControlCreateManyMemberInputEnvelopeSchema;
