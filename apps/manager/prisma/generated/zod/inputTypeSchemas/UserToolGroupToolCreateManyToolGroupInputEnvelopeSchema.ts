import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateManyToolGroupInputSchema } from './UserToolGroupToolCreateManyToolGroupInputSchema';

export const UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema: z.ZodType<Prisma.UserToolGroupToolCreateManyToolGroupInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserToolGroupToolCreateManyToolGroupInputSchema),z.lazy(() => UserToolGroupToolCreateManyToolGroupInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserToolGroupToolCreateManyToolGroupInputEnvelopeSchema;
