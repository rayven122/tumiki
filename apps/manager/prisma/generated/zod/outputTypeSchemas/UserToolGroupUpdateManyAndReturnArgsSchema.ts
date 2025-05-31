import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupUpdateManyMutationInputSchema } from '../inputTypeSchemas/UserToolGroupUpdateManyMutationInputSchema'
import { UserToolGroupUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/UserToolGroupUncheckedUpdateManyInputSchema'
import { UserToolGroupWhereInputSchema } from '../inputTypeSchemas/UserToolGroupWhereInputSchema'

export const UserToolGroupUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.UserToolGroupUpdateManyAndReturnArgs> = z.object({
  data: z.union([ UserToolGroupUpdateManyMutationInputSchema,UserToolGroupUncheckedUpdateManyInputSchema ]),
  where: UserToolGroupWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserToolGroupUpdateManyAndReturnArgsSchema;
