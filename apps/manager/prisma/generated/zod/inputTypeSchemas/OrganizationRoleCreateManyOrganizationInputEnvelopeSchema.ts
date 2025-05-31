import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { OrganizationRoleCreateManyOrganizationInputSchema } from './OrganizationRoleCreateManyOrganizationInputSchema';

export const OrganizationRoleCreateManyOrganizationInputEnvelopeSchema: z.ZodType<Prisma.OrganizationRoleCreateManyOrganizationInputEnvelope> = z.object({
  data: z.union([ z.lazy(() => OrganizationRoleCreateManyOrganizationInputSchema),z.lazy(() => OrganizationRoleCreateManyOrganizationInputSchema).array() ]),
  skipDuplicates: z.boolean().optional()
}).strict();

export default OrganizationRoleCreateManyOrganizationInputEnvelopeSchema;
