import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigWhereInputSchema } from '../inputTypeSchemas/UserMcpServerConfigWhereInputSchema'

export const UserMcpServerConfigDeleteManyArgsSchema: z.ZodType<Prisma.UserMcpServerConfigDeleteManyArgs> = z.object({
  where: UserMcpServerConfigWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerConfigDeleteManyArgsSchema;
