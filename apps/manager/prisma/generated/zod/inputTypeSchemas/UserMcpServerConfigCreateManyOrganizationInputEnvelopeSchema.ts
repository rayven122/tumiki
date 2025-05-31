import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerConfigCreateManyOrganizationInputSchema } from './UserMcpServerConfigCreateManyOrganizationInputSchema';

export const UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerConfigCreateManyOrganizationInputSchema),z.lazy(() => UserMcpServerConfigCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerConfigCreateManyOrganizationInputEnvelopeSchema;
