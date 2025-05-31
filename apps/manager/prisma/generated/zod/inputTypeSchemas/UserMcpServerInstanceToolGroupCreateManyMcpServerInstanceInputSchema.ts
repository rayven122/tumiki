import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInput> = z.object({
  toolGroupId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerInstanceToolGroupCreateManyMcpServerInstanceInputSchema;
