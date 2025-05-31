import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const UserMcpServerConfigScalarWhereInputSchema: z.ZodType<Prisma.UserMcpServerConfigScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerConfigScalarWhereInputSchema),z.lazy(() => UserMcpServerConfigScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  envVars: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  mcpServerId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserMcpServerConfigScalarWhereInputSchema;
