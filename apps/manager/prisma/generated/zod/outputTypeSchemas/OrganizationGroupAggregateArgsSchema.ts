import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { OrganizationGroupWhereInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereInputSchema'
import { OrganizationGroupOrderByWithRelationInputSchema } from '../inputTypeSchemas/OrganizationGroupOrderByWithRelationInputSchema'
import { OrganizationGroupWhereUniqueInputSchema } from '../inputTypeSchemas/OrganizationGroupWhereUniqueInputSchema'

export const OrganizationGroupAggregateArgsSchema: z.ZodType<Prisma.OrganizationGroupAggregateArgs> = z.object({
  where: OrganizationGroupWhereInputSchema.optional(),
  orderBy: z.union([ OrganizationGroupOrderByWithRelationInputSchema.array(),OrganizationGroupOrderByWithRelationInputSchema ]).optional(),
  cursor: OrganizationGroupWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default OrganizationGroupAggregateArgsSchema;
