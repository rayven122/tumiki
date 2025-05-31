import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupToolWhereInputSchema } from '../inputTypeSchemas/UserToolGroupToolWhereInputSchema'
import { UserToolGroupToolOrderByWithAggregationInputSchema } from '../inputTypeSchemas/UserToolGroupToolOrderByWithAggregationInputSchema'
import { UserToolGroupToolScalarFieldEnumSchema } from '../inputTypeSchemas/UserToolGroupToolScalarFieldEnumSchema'
import { UserToolGroupToolScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/UserToolGroupToolScalarWhereWithAggregatesInputSchema'

export const UserToolGroupToolGroupByArgsSchema: z.ZodType<Prisma.UserToolGroupToolGroupByArgs> = z.object({
  where: UserToolGroupToolWhereInputSchema.optional(),
  orderBy: z.union([ UserToolGroupToolOrderByWithAggregationInputSchema.array(),UserToolGroupToolOrderByWithAggregationInputSchema ]).optional(),
  by: UserToolGroupToolScalarFieldEnumSchema.array(),
  having: UserToolGroupToolScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserToolGroupToolGroupByArgsSchema;
