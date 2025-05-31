import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { UserMcpServerInstanceToolGroupWhereInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupWhereInputSchema'
import { UserMcpServerInstanceToolGroupOrderByWithAggregationInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupOrderByWithAggregationInputSchema'
import { UserMcpServerInstanceToolGroupScalarFieldEnumSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupScalarFieldEnumSchema'
import { UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema'

export const UserMcpServerInstanceToolGroupGroupByArgsSchema: z.ZodType<Prisma.UserMcpServerInstanceToolGroupGroupByArgs> = z.object({
  where: UserMcpServerInstanceToolGroupWhereInputSchema.optional(),
  orderBy: z.union([ UserMcpServerInstanceToolGroupOrderByWithAggregationInputSchema.array(),UserMcpServerInstanceToolGroupOrderByWithAggregationInputSchema ]).optional(),
  by: UserMcpServerInstanceToolGroupScalarFieldEnumSchema.array(),
  having: UserMcpServerInstanceToolGroupScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default UserMcpServerInstanceToolGroupGroupByArgsSchema;
