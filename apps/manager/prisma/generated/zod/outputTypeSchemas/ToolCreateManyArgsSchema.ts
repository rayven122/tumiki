import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolCreateManyInputSchema } from '../inputTypeSchemas/ToolCreateManyInputSchema'

export const ToolCreateManyArgsSchema: z.ZodType<Prisma.ToolCreateManyArgs> = z.object({
  data: z.union([ ToolCreateManyInputSchema,ToolCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default ToolCreateManyArgsSchema;
