import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateManyToolInputSchema } from './UserToolGroupToolCreateManyToolInputSchema';

export const UserToolGroupToolCreateManyToolInputEnvelopeSchema: z.ZodType<Prisma.UserToolGroupToolCreateManyToolInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserToolGroupToolCreateManyToolInputSchema),z.lazy(() => UserToolGroupToolCreateManyToolInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserToolGroupToolCreateManyToolInputEnvelopeSchema;
