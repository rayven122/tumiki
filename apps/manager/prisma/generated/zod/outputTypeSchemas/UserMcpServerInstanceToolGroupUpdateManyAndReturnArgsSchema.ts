import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema'
import { UserMcpServerInstanceToolGroupUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupUncheckedUpdateManyInputSchema'
import { UserMcpServerInstanceToolGroupWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereInputSchema'

export const UserMcpServerInstanceToolGroupUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserMcpServerInstanceToolGroupUpdateManyMutationInputSchema,UserMcpServerInstanceToolGroupUncheckedUpdateManyInputSchema ]),
  where: UserMcpServerInstanceToolGroupWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceToolGroupUpdateManyAndReturnArgsSchema;
