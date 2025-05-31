import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateManyUserInputSchema } from './UserMcpServerInstanceCreateManyUserInputSchema';

export const UserMcpServerInstanceCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerInstanceCreateManyUserInputSchema),z.lazy(() => UserMcpServerInstanceCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerInstanceCreateManyUserInputEnvelopeSchema;
