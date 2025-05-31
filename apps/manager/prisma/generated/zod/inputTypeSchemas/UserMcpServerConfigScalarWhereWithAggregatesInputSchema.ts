import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { StringNullableWithAggregatesFilterSchema } from './StringNullableWithAggregatesFilterSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const UserMcpServerConfigScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserMcpServerConfigScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereWithAggregatesInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerConfigScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereWithAggregatesInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  envVars: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  mcpServerId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserMcpServerConfigScalarWhereWithAggregatesInputSchema;
