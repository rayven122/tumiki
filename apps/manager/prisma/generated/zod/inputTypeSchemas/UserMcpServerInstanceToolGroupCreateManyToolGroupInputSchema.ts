import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerInstanceToolGroupCreateManyToolGroupInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupCreateManyToolGroupInput> = z.object({
  mcpServerInstanceId: z.string(),
  sortOrder: z.number().optional(),
  createdAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerInstanceToolGroupCreateManyToolGroupInputSchema;
