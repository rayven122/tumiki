import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateManyUserInputSchema } from './UserToolGroupCreateManyUserInputSchema';

export const UserToolGroupCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.UserToolGroupCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserToolGroupCreateManyUserInputSchema),z.lazy(() => UserToolGroupCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserToolGroupCreateManyUserInputEnvelopeSchema;
