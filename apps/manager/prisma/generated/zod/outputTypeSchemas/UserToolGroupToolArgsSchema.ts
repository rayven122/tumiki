import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolSelectSchema } from '../inputTypeSchemas/UserToolGroupToolSelectSchema';
import { UserToolGroupToolIncludeSchema } from '../inputTypeSchemas/UserToolGroupToolIncludeSchema';

export const UserToolGroupToolArgsSchema: z.ZodType<Prisma.UserToolGroupToolDefaultArgs> = z.object({
  select: z.lazy(() => UserToolGroupToolSelectSchema).optional(),
  include: z.lazy(() => UserToolGroupToolIncludeSchema).optional(),
}).strict();

export default UserToolGroupToolArgsSchema;
