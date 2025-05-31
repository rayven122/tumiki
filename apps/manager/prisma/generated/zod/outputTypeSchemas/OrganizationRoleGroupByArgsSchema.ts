import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleWhereInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereInputSchema'
import { OrganizationRoleOrderByWithAggregationInputSchema } from '../inputTypeSchemas/OrganizationRoleOrderByWithAggregationInputSchema'
import { OrganizationRoleScalarFieldEnumSchema } from '../inputTypeSchemas/OrganizationRoleScalarFieldEnumSchema'
import { OrganizationRoleScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/OrganizationRoleScalarWhereWithAggregatesInputSchema'

export const OrganizationRoleGroupByArgsSchema: z.ZodType<Prisma.OrganizationRoleGroupByArgs> = z.object({
  where: OrganizationRoleWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationRoleOrderByWithAggregationInputSchema.array(),OrganizationRoleOrderByWithAggregationInputSchema ]).optional(),
  by: OrganizationRoleScalarFieldEnumSchema.array(),
  having: OrganizationRoleScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationRoleGroupByArgsSchema;
