import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolWhereInputSchema } from '../inputTypeSchemas/ToolWhereInputSchema'

export const ToolDeleteManyArgsSchema: z.ZodType<Prisma.ToolDeleteManyArgs> = z.object({
  where: ToolWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default ToolDeleteManyArgsSchema;
