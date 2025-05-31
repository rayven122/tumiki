import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationRoleCreateManyOrganizationInputSchema: z.ZodType<Prisma.OrganizationRoleCreateManyOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationRoleCreateManyOrganizationInputSchema;
