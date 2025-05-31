import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereInputSchema'

export const UserMcpServerInstanceToolGroupDeleteManyArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupDeleteManyArgs> = z.object({
  where: UserMcpServerInstanceToolGroupWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceToolGroupDeleteManyArgsSchema;
