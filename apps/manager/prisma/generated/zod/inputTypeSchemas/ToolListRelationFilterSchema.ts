import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { ToolWhereInputSchema } from './ToolWhereInputSchema';

export const ToolListRelationFilterSchema: z.ZodType<Prisma.ToolListRelationFilter> = z.object({
  every: z.lazy(() => ToolWhereInputSchema).optional(),
  some: z.lazy(() => ToolWhereInputSchema).optional(),
  none: z.lazy(() => ToolWhereInputSchema).optional()
}).strict();

export default ToolListRelationFilterSchema;
