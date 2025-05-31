import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserToolGroupWhereInputSchema } from '../inputTypeSchemas/UserToolGroupWhereInputSchema'
import { UserToolGroupOrderByWithAggregationInputSchema } from '../inputTypeSchemas/UserToolGroupOrderByWithAggregationInputSchema'
import { UserToolGroupScalarFieldEnumSchema } from '../inputTypeSchemas/UserToolGroupScalarFieldEnumSchema'
import { UserToolGroupScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/UserToolGroupScalarWhereWithAggregatesInputSchema'

export const UserToolGroupGroupByArgsSchema: z.ZodType<Prisma.UserToolGroupGroupByArgs> = z.object({
  where: UserToolGroupWhereInputSchema.optional(),
  orderBy: z.union([ UserToolGroupOrderByWithAggregationInputSchema.array(),UserToolGroupOrderByWithAggregationInputSchema ]).optional(),
  by: UserToolGroupScalarFieldEnumSchema.array(),
  having: UserToolGroupScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserToolGroupGroupByArgsSchema;
