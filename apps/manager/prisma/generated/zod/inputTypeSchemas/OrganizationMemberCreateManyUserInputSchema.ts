import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const OrganizationMemberCreateManyUserInputSchema: z.ZodType<Prisma.OrganizationMemberCreateManyUserInput> = z.object({
  id: z.string().optional(),
  organizationId: z.string(),
  isAdmin: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default OrganizationMemberCreateManyUserInputSchema;
