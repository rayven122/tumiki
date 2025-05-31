import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupCreateManyInputSchema: z.ZodType<Prisma.UserToolGroupCreateManyInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  userId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupCreateManyInputSchema;
