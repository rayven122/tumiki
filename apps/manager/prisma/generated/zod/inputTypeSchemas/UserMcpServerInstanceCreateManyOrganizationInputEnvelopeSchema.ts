import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserMcpServerInstanceCreateManyOrganizationInputSchema } from './UserMcpServerInstanceCreateManyOrganizationInputSchema';

export const UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.UserMcpServerInstanceCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserMcpServerInstanceCreateManyOrganizationInputSchema),z.lazy(() => UserMcpServerInstanceCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserMcpServerInstanceCreateManyOrganizationInputEnvelopeSchema;
