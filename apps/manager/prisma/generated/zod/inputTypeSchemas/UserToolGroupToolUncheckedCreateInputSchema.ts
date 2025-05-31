import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolUncheckedCreateInputSchema: z.ZodType<Prisma.UserToolGroupToolUncheckedCreateInput> = z.object({
  userMcpServerConfigId: z.string(),
  toolGroupId: z.string(),
  toolId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupToolUncheckedCreateInputSchema;
