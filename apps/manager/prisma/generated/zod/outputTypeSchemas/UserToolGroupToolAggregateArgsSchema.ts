import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolWhereInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereInputSchema'
import { UserToolGroupToolOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserToolGroupToolOrderByWithRelationInputSchema'
import { UserToolGroupToolWhereUniqueInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereUniqueInputSchema'

export const UserToolGroupToolAggregateArgsSchema: z.ZodType<Prisma.UserToolGroupToolAggregateArgs> = z.object({
  where: UserToolGroupToolWhereInputSchema.optional(),
  orderBy: z.union([ UserToolGroupToolOrderByWithRelationInputSchema.array(),UserToolGroupToolOrderByWithRelationInputSchema ]).optional(),
  cursor: UserToolGroupToolWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserToolGroupToolAggregateArgsSchema;
