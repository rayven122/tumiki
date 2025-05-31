import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerInstanceToolGroupCreateManyInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateManyInput> = z.object({
  mcpServerInstanceId: z.string(),
  toolGroupId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerInstanceToolGroupCreateManyInputSchema;
