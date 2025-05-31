import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolWhereInputSchema } from '../inputTypeSchemas/ToolWhereInputSchema'
import { ToolOrderByWithAggregationInputSchema } from '../inputTypeSchemas/ToolOrderByWithAggregationInputSchema'
import { ToolScalarFieldEnumSchema } from '../inputTypeSchemas/ToolScalarFieldEnumSchema'
import { ToolScalarWhereWithAggregatesInputSchema } from '../inputTypeSchemas/ToolScalarWhereWithAggregatesInputSchema'

export const ToolGroupByArgsSchema: z.ZodType<Prisma.ToolGroupByArgs> = z.object({
  where: ToolWhereInputSchema.optional(),
  orderBy: z.union([ ToolOrderByWithAggregationInputSchema.array(),ToolOrderByWithAggregationInputSchema ]).optional(),
  by: ToolScalarFieldEnumSchema.array(),
  having: ToolScalarWhereWithAggregatesInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default ToolGroupByArgsSchema;
