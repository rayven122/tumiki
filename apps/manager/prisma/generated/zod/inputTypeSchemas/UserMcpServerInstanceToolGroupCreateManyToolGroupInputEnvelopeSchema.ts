import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceToolGroupCreateManyToolGroupInputSchema } from './UserMcpServerInstanceToolGroupCreateManyToolGroupInputSchema';

export const UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerInstanceToolGroupCreateManyToolGroupInputSchema),z.lazy(() => UserMcpServerInstanceToolGroupCreateManyToolGroupInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerInstanceToolGroupCreateManyToolGroupInputEnvelopeSchema;
