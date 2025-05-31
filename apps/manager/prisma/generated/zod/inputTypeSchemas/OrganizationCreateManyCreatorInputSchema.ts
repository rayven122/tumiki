import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationCreateManyCreatorInputSchema: z.ZodType<Prisma.OrganizationCreateManyCreatorInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  isDeleted: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationCreateManyCreatorInputSchema;
