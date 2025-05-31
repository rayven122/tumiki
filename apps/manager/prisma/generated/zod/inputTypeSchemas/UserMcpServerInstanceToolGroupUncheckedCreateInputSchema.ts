import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerInstanceToolGroupUncheckedCreateInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUncheckedCreateInput> = z.object({
  mcpServerInstanceId: z.string(),
  toolGroupId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerInstanceToolGroupUncheckedCreateInputSchema;
