import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ToolUpdateManyMutationInputSchema } from '../inputTypeSchemas/ToolUpdateManyMutationInputSchema'
import { ToolUncheckedUpdateManyInputSchema } from '../inputTypeSchemas/ToolUncheckedUpdateManyInputSchema'
import { ToolWhereInputSchema } from '../inputTypeSchemas/ToolWhereInputSchema'

export const ToolUpdateManyArgsSchema: z.ZodType<Prisma.ToolUpdateManyArgs> = z.object({
  data: z.union([ ToolUpdateManyMutationInputSchema,ToolUncheckedUpdateManyInputSchema ]),
  where: ToolWhereInputSchema.optional(),
  limit: z.number().optional(),
}).strict() ;

export default ToolUpdateManyArgsSchema;
