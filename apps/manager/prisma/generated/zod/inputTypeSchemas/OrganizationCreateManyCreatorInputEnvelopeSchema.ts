import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationCreateManyCreatorInputSchema } from './OrganizationCreateManyCreatorInputSchema';

export const OrganizationCreateManyCreatorInputEnvelopeSchema: z.ZodType<Prisma.OrganizationCreateManyCreatorInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationCreateManyCreatorInputSchema),z.lazy(() => OrganizationCreateManyCreatorInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationCreateManyCreatorInputEnvelopeSchema;
