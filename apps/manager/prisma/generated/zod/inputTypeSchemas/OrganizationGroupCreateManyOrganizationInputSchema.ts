import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationGroupCreateManyOrganizationInputSchema: z.ZodType<Prisma.OrganizationGroupCreateManyOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationGroupCreateManyOrganizationInputSchema;
