import type { Prisma } from '@prisma/client';

import { z } from 'zod';

export const UserToolGroupToolToolGroupIdUserMcpServerConfigIdToolIdCompoundUniqueInputSchema: z.ZodType<Prisma.UserToolGroupToolToolGroupIdUserMcpServerConfigIdToolIdCompoundUniqueInput> = z.object({
  toolGroupId: z.string(),
  userMcpServerConfigId: z.string(),
  toolId: z.string()
}).strict();

export default UserToolGroupToolToolGroupIdUserMcpServerConfigIdToolIdCompoundUniqueInputSchema;
