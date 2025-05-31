import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema: z.ZodType<Prisma.OrganizationGroupOrganizationIdNameCompoundUniqueInput> = z.object({
  organizationId: z.string(),
  name: z.string()
}).strict();

export default OrganizationGroupOrganizationIdNameCompoundUniqueInputSchema;
