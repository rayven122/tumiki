import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationGroupCreateManyInputSchema: z.ZodType<Prisma.OrganizationGroupCreateManyInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  organizationId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationGroupCreateManyInputSchema;
