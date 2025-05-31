import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolWhereInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereInputSchema'

export const UserToolGroupToolDeleteManyArgsSchema: z.ZodType<Prisma.UserToolGroupToolDeleteManyArgs> = z.object({
  where: UserToolGroupToolWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserToolGroupToolDeleteManyArgsSchema;
