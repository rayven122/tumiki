import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationMemberCreateManyOrganizationInputSchema: z.ZodType<Prisma.OrganizationMemberCreateManyOrganizationInput> = z.object({
  id: z.string().optional(),
  userId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationMemberCreateManyOrganizationInputSchema;
