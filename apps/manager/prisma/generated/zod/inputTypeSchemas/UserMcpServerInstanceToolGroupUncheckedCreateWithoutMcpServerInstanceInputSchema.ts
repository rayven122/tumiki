import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInput> = z.object({
  toolGroupId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerInstanceToolGroupUncheckedCreateWithoutMcpServerInstanceInputSchema;
