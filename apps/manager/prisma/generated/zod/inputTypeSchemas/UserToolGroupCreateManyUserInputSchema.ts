import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupCreateManyUserInputSchema: z.ZodType<Prisma.UserToolGroupCreateManyUserInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupCreateManyUserInputSchema;
