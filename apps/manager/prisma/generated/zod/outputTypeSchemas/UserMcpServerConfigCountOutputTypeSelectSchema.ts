import { z } from 'zod';
import type { Prisma } from '@prisma/client';

export const UserMcpServerConfigCountOutputTypeSelectSchema: z.ZodType<Prisma.UserMcpServerConfigCountOutputTypeSelect> = z.object({
  tools: z.boolean().optional(),
  userToolGroupTools: z.boolean().optional(),
}).strict();

export default UserMcpServerConfigCountOutputTypeSelectSchema;
