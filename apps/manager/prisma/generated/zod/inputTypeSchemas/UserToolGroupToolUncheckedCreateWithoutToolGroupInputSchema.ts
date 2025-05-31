import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolUncheckedCreateWithoutToolGroupInput> = z.object({
  userMcpServerConfigId: z.string(),
  toolId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupToolUncheckedCreateWithoutToolGroupInputSchema;
