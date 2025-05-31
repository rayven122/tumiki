import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupWhereInputSchema } from '../inputTypeSchemas/UserToolGroupWhereInputSchema'
import { UserToolGroupOrderByWithRelationInputSchema } from '../inputTypeSchemas/UserToolGroupOrderByWithRelationInputSchema'
import { UserToolGroupWhereUniqueInputSchema } from '../inputTypeSchemas/UserToolGroupWhereUniqueInputSchema'

export const UserToolGroupAggregateArgsSchema: z.ZodType<Prisma.UserToolGroupAggregateArgs> = z.object({
  where: UserToolGroupWhereInputSchema.optional(),
  orderBy: z.union([ UserToolGroupOrderByWithRelationInputSchema.array(),UserToolGroupOrderByWithRelationInputSchema ]).optional(),
  cursor: UserToolGroupWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserToolGroupAggregateArgsSchema;
