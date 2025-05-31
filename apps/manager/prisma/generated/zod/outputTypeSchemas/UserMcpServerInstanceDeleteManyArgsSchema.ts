import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceWhereInputSchema'

export const UserMcpServerInstanceDeleteManyArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceDeleteManyArgs> = z.object({
  where: UserMcpServerInstanceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceDeleteManyArgsSchema;
