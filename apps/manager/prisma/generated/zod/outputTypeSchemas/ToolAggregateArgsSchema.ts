import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolWhereInputSchema } from '../inputTypeSchemas/ToolWhereInputSchema'
import { ToolOrderByWithRelationInputSchema } from '../inputTypeSchemas/ToolOrderByWithRelationInputSchema'
import { ToolWhereUniqueInputSchema } from '../inputTypeSchemas/ToolWhereUniqueInputSchema'

export const ToolAggregateArgsSchema: z.ZodType<Prisma.ToolAggregateArgs> = z.object({
  where: ToolWhereInputSchema.optional(),
  orderBy: z.union([ ToolOrderByWithRelationInputSchema.array(),ToolOrderByWithRelationInputSchema ]).optional(),
  cursor: ToolWhereUniqueInputSchema.optional(),
  take: z.number().optional(),
  skip: z.number().optional(),
}).strict() ;

export default ToolAggregateArgsSchema;
