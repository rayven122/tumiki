import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerConfigWhereInputSchema } from '../inputTypeSchemas/UserMcpServerConfigWhereInputSchema'
import { UserMcpServerConfigOrderByWithAggregationInputSchema } from '../inputTypeSchemas/UserMcpServerConfigOrderByWithAggregationInputSchema'
import { UserMcpServerConfigScalarFieldEnumSchema } from '../inputTypeSchemas/UserMcpServerConfigScalarFieldEnumSchema'
import { UserMcpServerConfigScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/UserMcpServerConfigScalarWhereWithAggregatesInputSchema'

export const UserMcpServerConfigGroupByArgsSchema: z.ZodType<Prisma.UserMcpServerConfigGroupByArgs> = z.object({
  where: UserMcpServerConfigWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerConfigOrderByWithAggregationInputSchema.array(),UserMcpServerConfigOrderByWithAggregationInputSchema ]).optional(),
  by: UserMcpServerConfigScalarFieldEnumSchema.array(),
  having: UserMcpServerConfigScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserMcpServerConfigGroupByArgsSchema;
