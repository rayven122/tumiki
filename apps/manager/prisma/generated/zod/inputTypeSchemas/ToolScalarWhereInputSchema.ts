import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { JsonFilterSchema } from './JsonFilterSchema';
import { BoolFilterSchema } from './BoolFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const ToolScalarWhereInputSchema: z.ZodType<Prisma.ToolScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => ToolScalarWhereInputSchema),z.lazy(() => ToolScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => ToolScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => ToolScalarWhereInputSchema),z.lazy(() => ToolScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  inputSchema: z.lazy(() => JsonFilterSchema).optional(),
  isEnabled: z.union([ z.lazy(() => BoolFilterSchema),z.boolean() ]).optional(),
  mcpServerId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default ToolScalarWhereInputSchema;
