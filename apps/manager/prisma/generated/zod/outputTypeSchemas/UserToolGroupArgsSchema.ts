import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupSelectSchema } from '../inputTypeSchemas/UserToolGroupSelectSchema';
import { UserToolGroupIncludeSchema } from '../inputTypeSchemas/UserToolGroupIncludeSchema';

export const UserToolGroupArgsSchema: z.ZodType<Prisma.UserToolGroupDefaultArgs> = z.object({
  select: z.lazy(() => UserToolGroupSelectSchema).optional(),
  include: z.lazy(() => UserToolGroupIncludeSchema).optional(),
}).strict();

export default UserToolGroupArgsSchema;
