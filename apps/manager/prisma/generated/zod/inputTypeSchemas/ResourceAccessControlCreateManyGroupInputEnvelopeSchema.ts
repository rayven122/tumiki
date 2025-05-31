import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ResourceAccessControlCreateManyGroupInputSchema } from './ResourceAccessControlCreateManyGroupInputSchema';

export const ResourceAccessControlCreateManyGroupInputEnvelopeSchema: z.ZodType<Prisma.ResourceAccessControlCreateManyGroupInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => ResourceAccessControlCreateManyGroupInputSchema),z.lazy(() => ResourceAccessControlCreateManyGroupInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default ResourceAccessControlCreateManyGroupInputEnvelopeSchema;
