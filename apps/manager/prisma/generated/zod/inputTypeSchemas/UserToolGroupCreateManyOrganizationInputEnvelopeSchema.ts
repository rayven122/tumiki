import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { UserToolGroupCreateManyOrganizationInputSchema } from './UserToolGroupCreateManyOrganizationInputSchema';

export const UserToolGroupCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.UserToolGroupCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => UserToolGroupCreateManyOrganizationInputSchema),z.lazy(() => UserToolGroupCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default UserToolGroupCreateManyOrganizationInputEnvelopeSchema;
