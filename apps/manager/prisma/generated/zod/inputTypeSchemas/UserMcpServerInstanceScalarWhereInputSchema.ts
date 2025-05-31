import type { Prisma } from '@prisma/client';

import { z } from 'zod';
import { StringFilterSchema } from './StringFilterSchema';
import { StringNullableFilterSchema } from './StringNullableFilterSchema';
import { EnumServerStatusFilterSchema } from './EnumServerStatusFilterSchema';
import { ServerStatusSchema } from './ServerStatusSchema';
import { EnumServerTypeFilterSchema } from './EnumServerTypeFilterSchema';
import { ServerTypeSchema } from './ServerTypeSchema';
import { DateTimeFilterSchema } from './DateTimeFilterSchema';

export const UserMcpServerInstanceScalarWhereInputSchema: z.ZodType<Prisma.UserMcpServerInstanceScalarWhereInput> = z.object({
  AND: z.union([ z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema).array() ]).optional(),
  OR: z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema).array().optional(),
  NOT: z.union([ z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema),z.lazy(() => UserMcpServerInstanceScalarWhereInputSchema).array() ]).optional(),
  id: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  name: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  description: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  iconPath: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  serverStatus: z.union([ z.lazy(() => EnumServerStatusFilterSchema),z.lazy(() => ServerStatusSchema) ]).optional(),
  serverType: z.union([ z.lazy(() => EnumServerTypeFilterSchema),z.lazy(() => ServerTypeSchema) ]).optional(),
  toolGroupId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  userId: z.union([ z.lazy(() => StringFilterSchema),z.string() ]).optional(),
  organizationId: z.union([ z.lazy(() => StringNullableFilterSchema),z.string() ]).optional().nullable(),
  createdAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
  updatedAt: z.union([ z.lazy(() => DateTimeFilterSchema),z.coerce.date() ]).optional(),
}).strict();

export default UserMcpServerInstanceScalarWhereInputSchema;
