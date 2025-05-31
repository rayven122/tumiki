import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlWhereInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereInputSchema'
import { ResourceAccessControlOrderByWithRelationInputSchema } from '../inputTypeSchemas/ResourceAccessControlOrderByWithRelationInputSchema'
import { ResourceAccessControlWhereUniqueInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereUniqueInputSchema'

export const ResourceAccessControlAggregateArgsSchema: z.ZodType<Prisma.ResourceAccessControlAggregateArgs> = z.object({
  where: ResourceAccessControlWhereInputSchema.optional(),
  orderBy: z.union([ ResourceAccessControlOrderByWithRelationInputSchema.array(),ResourceAccessControlOrderByWithRelationInputSchema ]).optional(),
  cursor: ResourceAccessControlWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default ResourceAccessControlAggregateArgsSchema;
