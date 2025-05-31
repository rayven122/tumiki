import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupWhereInputSchema } from '../inputTypeSchemas/UserToolGroupWhereInputSchema'

export const UserToolGroupDeleteManyArgsSchema: z.ZodType<Prisma.UserToolGroupDeleteManyArgs> = z.object({
  where: UserToolGroupWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserToolGroupDeleteManyArgsSchema;
