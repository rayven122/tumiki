import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationRoleWhereInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereInputSchema'
import { OrganizationRoleOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationRoleOrderByWithRelationInputSchema'
import { OrganizationRoleWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationRoleWhereUniqueInputSchema'

export const OrganizationRoleAggregateArgsSchema: z.ZodType<Prisma.OrganizationRoleAggregateArgs> = z.object({
  where: OrganizationRoleWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationRoleOrderByWithRelationInputSchema.array(),OrganizationRoleOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationRoleWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationRoleAggregateArgsSchema;
