import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInputSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInput> = z.object({
  mcpServerInstanceId: z.string(),
  toolGroupId: z.string()
}).strict();

export default UserMcpServerInstanceToolGroupMcpServerInstanceIdToolGroupIdCompoundUniqueInputSchema;
