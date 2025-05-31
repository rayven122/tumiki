import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberWhereInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereInputSchema'
import { OrganizationMemberOrderByWithAggregationInputSchema } from '../inputTypeSchemas/OrganizationMemberOrderByWithAggregationInputSchema'
import { OrganizationMemberScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationMemberScalarFieldEnumSchema'
import { OrganizationMemberScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/OrganizationMemberScalarWhereWithAggregatesInputSchema'

export const OrganizationMemberGroupByArgsSchema: z.ZodType<Prisma.OrganizationMemberGroupByArgs> = z.object({
  where: OrganizationMemberWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationMemberOrderByWithAggregationInputSchema.array(),OrganizationMemberOrderByWithAggregationInputSchema ]).optional(),
  by: OrganizationMemberScalarFieldEnumSchema.array(),
  having: OrganizationMemberScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationMemberGroupByArgsSchema;
