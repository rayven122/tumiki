import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceUpdateManyMutationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceUpdateManyMutationInputSchema'
import { UserMcpServerInstanceUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceUncheckedUpdateManyInputSchema'
import { UserMcpServerInstanceWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceWhereInputSchema'

export const UserMcpServerInstanceUpdateManyArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceUpdateManyArgs> = z.object({
  data: z.union([ UserMcpServerInstanceUpdateManyMutationInputSchema,UserMcpServerInstanceUncheckedUpdateManyInputSchema ]),
  where: UserMcpServerInstanceWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceUpdateManyArgsSchema;
