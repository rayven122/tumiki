import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema: z.ZodType<Prisma.UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInput> = z.object({
  userId: z.string(),
  mcpServerId: z.string(),
  name: z.string()
}).strict();

export default UserMcpServerConfigUserIdMcpServerIdNameCompoundUniqueInputSchema;
