import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupCountOutputTypeSelectSchema } from './UserToolGroupCountOutputTypeSelectSchema';

export const UserToolGroupCountOutputTypeArgsSchema: z.ZodType<Prisma.UserToolGroupCountOutputTypeDefaultArgs> = z.object({
  select: z.lazy(() => UserToolGroupCountOutputTypeSelectSchema).nullish(),
}).strict();

export default UserToolGroupCountOutputTypeSelectSchema;
