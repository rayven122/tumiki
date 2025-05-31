import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationMemberWhereInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereInputSchema'
import { OrganizationMemberOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationMemberOrderByWithRelationInputSchema'
import { OrganizationMemberWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationMemberWhereUniqueInputSchema'

export const OrganizationMemberAggregateArgsSchema: z.ZodType<Prisma.OrganizationMemberAggregateArgs> = z.object({
  where: OrganizationMemberWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationMemberOrderByWithRelationInputSchema.array(),OrganizationMemberOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationMemberWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationMemberAggregateArgsSchema;
