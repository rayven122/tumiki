import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ResourceAccessControlWhereInputSchema } from '../inputTypeSchemas/ResourceAccessControlWhereInputSchema'
import { ResourceAccessControlOrderByWithAggregationInputSchema } from '../inputTypeSchemas/ResourceAccessControlOrderByWithAggregationInputSchema'
import { ResourceAccessControlScalarFieldEnumSchema } from '../inputTypeSchemas/ResourceAccessControlScalarFieldEnumSchema'
import { ResourceAccessControlScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/ResourceAccessControlScalarWhereWithAggregatesInputSchema'

export const ResourceAccessControlGroupByArgsSchema: z.ZodType<Prisma.ResourceAccessControlGroupByArgs> = z.object({
  where: ResourceAccessControlWhereInputSchema.optional(),
  orderBy: z.union([ ResourceAccessControlOrderByWithAggregationInputSchema.array(),ResourceAccessControlOrderByWithAggregationInputSchema ]).optional(),
  by: ResourceAccessControlScalarFieldEnumSchema.array(),
  having: ResourceAccessControlScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default ResourceAccessControlGroupByArgsSchema;
