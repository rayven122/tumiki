import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { McpServerWhereInputSchema } from './McpServerWhereInputSchema';

export const McpServerScalarRelationFilterSchema: z.ZodType<Prisma.McpServerScalarRelationFilter> = z.object({
  is: z.lazy(() => McpServerWhereInputSchema).optional(),
  isNot: z.lazy(() => McpServerWhereInputSchema).optional()
}).strict();

export default McpServerScalarRelationFilterSchema;
