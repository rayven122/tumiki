import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolCreateManyInputSchema } from '../inputTypeSchemas/ToolCreateManyInputSchema'

export const ToolCreateManyAndReturnArgsSchema: z.ZodType<Prisma.ToolCreateManyAndReturnArgs> = z.object({
  data: z.union([ ToolCreateManyInputSchema,ToolCreateManyInputSchema.array() ]),
  skipDuplicates: z.boolean().optional(),
}).strict() ;

export default ToolCreateManyAndReturnArgsSchema;
