import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolUpdateManyMutationInputSchema } from '../inputTypeSchemas/ToolUpdateManyMutationInputSchema'
import { ToolUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/ToolUncheckedUpdateManyInputSchema'
import { ToolWhereInputSchema } from '../inputTypeSchemas/ToolWhereInputSchema'

export const ToolUpdateManyAndReturnArgsSchema: z.ZodType<Prisma.ToolUpdateManyAndReturnArgs> = z.object({
  data: z.union([ ToolUpdateManyMutationInputSchema,ToolUncheckedUpdateManyInputSchema ]),
  where: ToolWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default ToolUpdateManyAndReturnArgsSchema;
