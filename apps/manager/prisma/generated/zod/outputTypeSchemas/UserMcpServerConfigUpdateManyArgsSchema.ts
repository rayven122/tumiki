import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigUpdateManyMutationInputSchema } from '../inputTypeSchemas/UserMcpServerConfigUpdateManyMutationInputSchema'
import { UserMcpServerConfigUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/UserMcpServerConfigUncheckedUpdateManyInputSchema'
import { UserMcpServerConfigWhereInputSchema } from '../inputTypeSchemas/UserMcpServerConfigWhereInputSchema'

export const UserMcpServerConfigUpdateManyArgsSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyArgs> = z.object({
  data: z.union([ UserMcpServerConfigUpdateManyMutationInputSchema,UserMcpServerConfigUncheckedUpdateManyInputSchema ]),
  where: UserMcpServerConfigWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerConfigUpdateManyArgsSchema;
