import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigCountOutputTypeSelectSchema } from './UserMcpServerConfigCountOutputTypeSelectSchema';

export const UserMcpServerConfigCountOutputTypeArgsSchema: z.ZodType<Prisma.UserMcpServerConfigCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserMcpServerConfigCountOutputTypeSelectSchema).nullish(),
}).strict();

export default UserMcpServerConfigCountOutputTypeSelectSchema;
