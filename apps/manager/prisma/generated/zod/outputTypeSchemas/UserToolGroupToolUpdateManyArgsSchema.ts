import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolUpdateManyMutationInputSchema } from '../inputTypeSchemas/UserToolGroupToolUpdateManyMutationInputSchema'
import { UserToolGroupToolUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/UserToolGroupToolUncheckedUpdateManyInputSchema'
import { UserToolGroupToolWhereInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereInputSchema'

export const UserToolGroupToolUpdateManyArgsSchema: z.ZodType<Prisma.UserToolGroupToolUpdateManyArgs> = z.object({
  data: z.union([ UserToolGroupToolUpdateManyMutationInputSchema,UserToolGroupToolUncheckedUpdateManyInputSchema ]),
  where: UserToolGroupToolWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default UserToolGroupToolUpdateManyArgsSchema;
