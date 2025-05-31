import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringWithAggregatesFilterSchema } from './StringWithAggregatesFilterSchema';
import { StringNullableWithAggregatesFilterSchema } from './StringNullableWithAggregatesFilterSchema';
import { EnumServerStatusWithAggregatesFilterSchema } from './EnumServerStatusWithAggregatesFilterSchema';
import { ServerStatusSchema } from './ServerStatusSchema';
import { EnumServerTypeWithAggregatesFilterSchema } from './EnumServerTypeWithAggregatesFilterSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { DateTimeWithAggregatesFilterSchema } from './DateTimeWithAggregatesFilterSchema';

export const UserMcpServerInstanceScalarWhereWithAggregatesInputSchema: z.ZodType<Prisma.UserMcpServerInstanceScalarWhereWithAggregatesInput> = z.object({
  AND: z.union([ z.lazy(() => UserMcpServerInstanceScalarWhereWithAggregatesInputSchema),z.lazy(() => UserMcpServerInstanceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerInstanceScalarWhereWithAggregatesInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerInstanceScalarWhereWithAggregatesInputSchema),z.lazy(() => UserMcpServerInstanceScalarWhereWithAggregatesInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  iconPath: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  serverStatus: z.union([ z.lazy(() => EnumServerStatusWithAggregatesFilterSchema),z.lazy(() => ServerStatusSchema) ]).optional(),
  serverType: z.union([ z.lazy(() => EnumServerTypeWithAggregatesFilterSchema),z.lazy(() => ServerTypeSchema) ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringWithAggregatesFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableWithAggregatesFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeWithAggregatesFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserMcpServerInstanceScalarWhereWithAggregatesInputSchema;
