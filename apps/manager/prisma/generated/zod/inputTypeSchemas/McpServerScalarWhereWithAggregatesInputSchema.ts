import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { StringNullableWithAggregatesFilterSchema } from './StringNullableWithAggregatesFilterSchema';
import { StringNullableListFilterSchema } from './StringNullableListFilterSchema';
import { BoolWithAggregatesFilterSchema } from './BoolWithAggregatesFilterSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const McpServerScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.McpServerScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => McpServerScalarWhereWithAggregatesInputSchema),z.lazy(() => McpServerScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => McpServerScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => McpServerScalarWhereWithAggregatesInputSchema),z.lazy(() => McpServerScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  iconPath: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  command: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  args: z.lazy(() => StringNullableListFilterSchema).optional(),
  envVars: z.lazy(() => StringNullableListFilterSchema).optional(),
  isPublic: z.union([ z.lazy(() => BoolWithAggregatesFilterSchema),z.boolean() ]).optional(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default McpServerScalarWhereWithAggregatesInputSchema;
