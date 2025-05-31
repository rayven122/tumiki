import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputSchema } from './UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputSchema';

export const UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputEnvelopeSchema;
