import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateManyUserInputSchema } from './UserMcpServerConfigCreateManyUserInputSchema';

export const UserMcpServerConfigCreateManyUserInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyUserInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerConfigCreateManyUserInputSchema),z.lazy(() => UserMcpServerConfigCreateManyUserInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerConfigCreateManyUserInputEnvelopeSchema;
