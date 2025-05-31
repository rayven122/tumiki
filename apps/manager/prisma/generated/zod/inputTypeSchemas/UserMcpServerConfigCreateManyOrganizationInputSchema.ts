import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerConfigCreateManyOrganizationInputSchema: z.ZodType<Prisma.UserMcpServerConfigCreateManyOrganizationInput> = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  envVars: z.string(),
  mcpServerId: z.string(),
  userId: z.string(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional()
}).strict();

export default UserMcpServerConfigCreateManyOrganizationInputSchema;
