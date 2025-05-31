import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceWhereInputSchema'
import { UserMcpServerInstanceOrderByWithAggregationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceOrderByWithAggregationInputSchema'
import { UserMcpServerInstanceScalarFieldEnumSchema } from '../inputTypeSchemas/UserMcpServerInstanceScalarFieldEnumSchema'
import { UserMcpServerInstanceScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceScalarWhereWithAggregatesInputSchema'

export const UserMcpServerInstanceGroupByArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceGroupByArgs> = z.object({
  where: UserMcpServerInstanceWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerInstanceOrderByWithAggregationInputSchema.array(),UserMcpServerInstanceOrderByWithAggregationInputSchema ]).optional(),
  by: UserMcpServerInstanceScalarFieldEnumSchema.array(),
  having: UserMcpServerInstanceScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceGroupByArgsSchema;
