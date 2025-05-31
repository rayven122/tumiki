import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolUncheckedCreateWithoutToolInputSchema: z.ZodType<Prisma.UserToolGroupToolUncheckedCreateWithoutToolInput> = z.object({
  userMcpServerConfigId: z.string(),
  toolGroupId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupToolUncheckedCreateWithoutToolInputSchema;
