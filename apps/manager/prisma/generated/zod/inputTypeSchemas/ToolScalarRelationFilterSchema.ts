import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereInputSchema } from './ToolWhereInputSchema';

export const ToolScalarRelationFilterSchema: z.ZodType<Prisma.ToolScalarRelationFilter> = z.object({
  is: z.lazy(() => ToolWhereInputSchema).optional(),
  isNot: z.lazy(() => ToolWhereInputSchema).optional()
}).strict();

export default ToolScalarRelationFilterSchema;
