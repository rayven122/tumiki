import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerConfigCreateManyUserInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyUserInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  mcpServerId: z.string(),
  organizationId: z.string().optional().nullable(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerConfigCreateManyUserInputSchema;
