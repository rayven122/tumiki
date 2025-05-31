import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupWhereInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereInputSchema'
import { OrganizationGroupOrderByWithAggregationInputSchema } from '../inputTypeSchemas/OrganizationGroupOrderByWithAggregationInputSchema'
import { OrganizationGroupScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationGroupScalarFieldEnumSchema'
import { OrganizationGroupScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/OrganizationGroupScalarWhereWithAggregatesInputSchema'

export const OrganizationGroupGroupByArgsSchema: z.ZodType<Prisma.OrganizationGroupGroupByArgs> = z.object({
  where: OrganizationGroupWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationGroupOrderByWithAggregationInputSchema.array(),OrganizationGroupOrderByWithAggregationInputSchema ]).optional(),
  by: OrganizationGroupScalarFieldEnumSchema.array(),
  having: OrganizationGroupScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationGroupGroupByArgsSchema;
