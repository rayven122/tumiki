import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigUpdateManyMutationInputSchema } from '../inputTypeSchemas/UserMcpServerConfigUpdateManyMutationInputSchema'
import { UserMcpServerConfigUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/UserMcpServerConfigUncheckedUpdateManyInputSchema'
import { UserMcpServerConfigWhereInputSchema } from '../inputTypeSchemas/UserMcpServerConfigWhereInputSchema'

export const UserMcpServerConfigUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserMcpServerConfigUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserMcpServerConfigUpdateManyMutationInputSchema,UserMcpServerConfigUncheckedUpdateManyInputSchema ]),
  where: UserMcpServerConfigWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerConfigUpdateManyAndReturnArgsSchema;
