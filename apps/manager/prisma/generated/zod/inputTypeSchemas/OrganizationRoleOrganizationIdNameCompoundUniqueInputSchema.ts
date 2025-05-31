import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema: z.ZodType<Prisma.OrganizationRoleOrganizationIdNameCompoundUniqueInput> = z.object({
  organizationId: z.string(),
  name: z.string()
}).strict();

export default OrganizationRoleOrganizationIdNameCompoundUniqueInputSchema;
