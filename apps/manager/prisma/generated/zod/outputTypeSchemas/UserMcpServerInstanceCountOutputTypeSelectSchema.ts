import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const UserMcpServerInstanceCountOutputTypeSelectSchema: z.ZodType<Prisma.UserMcpServerInstanceCountOutputTypeSelect> = z.object({
  mcpServerInstanceToolGroups: z.boolean().optional(),
}).strict();

export default UserMcpServerInstanceCountOutputTypeSelectSchema;
