import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceCountOutputTypeSelectSchema } from './UserMcpServerInstanceCountOutputTypeSelectSchema';

export const UserMcpServerInstanceCountOutputTypeArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserMcpServerInstanceCountOutputTypeSelectSchema).nullish(),
}).strict();

export default UserMcpServerInstanceCountOutputTypeSelectSchema;
