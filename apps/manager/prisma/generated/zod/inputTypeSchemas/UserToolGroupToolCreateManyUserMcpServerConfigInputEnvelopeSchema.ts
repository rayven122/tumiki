import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupToolCreateManyUserMcpServerConfigInputSchema } from './UserToolGroupToolCreateManyUserMcpServerConfigInputSchema';

export const UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema: z.ZodType<Prisma.UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserToolGroupToolCreateManyUserMcpServerConfigInputSchema),z.lazy(() => UserToolGroupToolCreateManyUserMcpServerConfigInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserToolGroupToolCreateManyUserMcpServerConfigInputEnvelopeSchema;
