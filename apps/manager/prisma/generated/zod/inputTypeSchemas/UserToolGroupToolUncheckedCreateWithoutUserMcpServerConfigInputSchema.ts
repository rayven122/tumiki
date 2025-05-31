import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema: z.ZodType<Prisma.UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInput> = z.object({
  toolGroupId: z.string(),
  toolId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupToolUncheckedCreateWithoutUserMcpServerConfigInputSchema;
