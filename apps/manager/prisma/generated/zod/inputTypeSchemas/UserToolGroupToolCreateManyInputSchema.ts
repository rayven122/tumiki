import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolCreateManyInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateManyInput> = z.object({
  userMcpServerConfigId: z.string(),
  toolGroupId: z.string(),
  toolId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupToolCreateManyInputSchema;
