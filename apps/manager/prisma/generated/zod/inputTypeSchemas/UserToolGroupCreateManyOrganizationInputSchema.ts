import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupCreateManyOrganizationInputSchema: z.ZodType<Prisma.UserToolGroupCreateManyOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  isEnabled: z.boolean().optional(),
  userId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupCreateManyOrganizationInputSchema;
