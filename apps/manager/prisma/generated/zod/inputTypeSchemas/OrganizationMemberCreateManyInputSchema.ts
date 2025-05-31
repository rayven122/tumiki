import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationMemberCreateManyInputSchema: z.ZodType<Prisma.OrganizationMemberCreateManyInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationMemberCreateManyInputSchema;
