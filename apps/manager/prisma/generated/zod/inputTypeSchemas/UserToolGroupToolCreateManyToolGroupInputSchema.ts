import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolCreateManyToolGroupInputSchema: z.ZodType<Prisma.UserToolGroupToolCreateManyToolGroupInput> = z.object({
  userMcpServerConfigId: z.string(),
  toolId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserToolGroupToolCreateManyToolGroupInputSchema;
