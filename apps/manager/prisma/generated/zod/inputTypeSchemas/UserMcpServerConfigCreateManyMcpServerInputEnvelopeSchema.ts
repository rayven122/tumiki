import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateManyMcpServerInputSchema } from './UserMcpServerConfigCreateManyMcpServerInputSchema';

export const UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyMcpServerInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerConfigCreateManyMcpServerInputSchema),z.lazy(() => UserMcpServerConfigCreateManyMcpServerInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerConfigCreateManyMcpServerInputEnvelopeSchema;
