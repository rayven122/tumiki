import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationRoleCreateManyInputSchema: z.ZodType<Prisma.OrganizationRoleCreateManyInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  isDefault: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationRoleCreateManyInputSchema;
